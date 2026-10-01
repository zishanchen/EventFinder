import mongoose from 'mongoose';
import Event from '../../models/Event.js';
import Invoice from '../../models/Invoice.js';
import Registration from '../../models/Registration.js';
import { resolveBillingWindow } from '../../services/billingService.js';
import { getPlatformSettings } from '../../services/platformSettingsService.js';

const buildRegex = (value) => {
    const escaped = String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped ? new RegExp(escaped, 'i') : null;
};

const getDocumentId = (value) => {
    return value?._id?.toString?.() || value?.toString?.() || '';
};

const billDto = ({ registration, event, invoice, settings }) => {
    const host = event?.creator;
    const participant = registration?.participant || invoice?.participant;
    const invoiceStatus = getInvoiceStatus(invoice);

    return {
        _id: invoice?._id || registration?._id,
        invoiceId: invoice?._id || null,
        registrationId: registration?._id || invoice?.registration || null,
        amount: invoice?.amount ?? buildBillAmount(registration, event, settings),
        currency: invoice?.currency || 'eur',
        billingMonth: invoice?.billingMonth || buildBillingMonth(event?.datetime || event?.date || registration?.createdAt),
        status: invoiceStatus,
        registrationStatus: registration?.status || null,
        paymentDate: invoice?.paymentDate || null,
        lastPaymentError: invoice?.lastPaymentError || null,
        createdAt: invoice?.createdAt || registration?.createdAt,
        participant: participant ? {
            _id: participant._id,
            username: participant.username,
            email: participant.email,
            role: participant.role
        } : null,
        host: host ? {
            _id: host._id,
            username: host.username,
            email: host.email,
            role: host.role
        } : null,
        event: event ? {
            _id: event._id,
            title: event.title || event.name || 'Event',
            date: event.date,
            datetime: event.datetime
        } : null
    };
};

const getInvoiceStatus = (invoice) => {
    if (!invoice) return 'Pending';

    if (invoice.status === 'Cancelled' && String(invoice.lastPaymentError || '').startsWith('Relieved by admin')) {
        return 'Relieved';
    }

    return invoice.status;
};

const buildBillingMonth = (date) => {
    const value = new Date(date);
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${value.getFullYear()}-${month}`;
};

const buildBillAmount = (registration, event, settings) => {
    if (registration?.status === 'CancelledLate') {
        return Number(event?.price || 0) * (Number(settings?.lateCancellationFeePercent ?? 50) / 100);
    }

    return Number(event?.price || 0);
};

const getBillDate = (bill) => {
    return new Date(bill.event?.datetime || bill.event?.date || bill.createdAt || 0).getTime();
};

const compareByLatestDate = (first, second) => {
    return getBillDate(second) - getBillDate(first);
};

const BILLABLE_REGISTRATION_STATUSES = ['Attended', 'CancelledLate'];
const BILLABLE_BILL_STATUSES = ['Pending', 'Unpaid', 'Paid', 'Failed', 'Relieved'];
const BILLABLE_INVOICE_STATUSES = ['Unpaid', 'Paid', 'Failed', 'Relieved'];
const RELIEVABLE_INVOICE_STATUSES = ['Unpaid', 'Failed'];

/*
Billing management only shows billable registrations for paid events:

| Registration status | Bill shown | Amount                          |
|---------------------|------------|---------------------------------|
| Attended            | Yes        | Full event price.               |
| CancelledLate       | Yes        | Configured late-cancel fee %.   |
| Registered          | No         | No charge exists yet.           |
| Denied              | No         | No charge exists.               |
| Cancelled           | No         | No charge exists.               |
| Removed             | No         | No charge exists.               |

Status meanings in this controller:

| Display status | Backing data                                |
|----------------|---------------------------------------------|
| Pending        | Billable registration with no invoice yet.  |
| Unpaid         | Existing invoice with status Unpaid.        |
| Paid           | Existing invoice with status Paid.          |
| Failed         | Existing invoice with status Failed.        |
| Relieved       | Existing invoice with status Relieved.      |

Pending is a bill state here, not an invoice status. The application does not
create Pending invoices in normal billing flows. A relieved pending bill keeps
statusBeforeRelief = 'Pending' only to remember that it came from a no-invoice
bill; restoring it creates a collectable Unpaid invoice.

Relieve and restore rules:

| Action  | Bill / invoice state          | Registration status       | Result / reason                                      |
|---------|-------------------------------|---------------------------|------------------------------------------------------|
| Relieve | Pending bill, no invoice yet  | Attended or CancelledLate | Create a Relieved invoice to record the waiver.      |
| Relieve | Unpaid or Failed invoice      | Attended or CancelledLate | Mark invoice Relieved and save its previous status.  |
| Relieve | Paid invoice                  | Attended or CancelledLate | Blocked because refunds are not handled here.        |
| Relieve | Relieved or Cancelled invoice | Attended or CancelledLate | Blocked because the bill is already non-collectable. |
| Restore | Relieved invoice              | Attended or CancelledLate | Allowed only before the billing month closes.        |
| Restore | Relieved from pending bill    | Attended or CancelledLate | Restore to Unpaid so the invoice can be collected.   |
| Restore | Any non-relieved invoice      | Attended or CancelledLate | Blocked because only relieved bills can be restored. |

The bill status filter exposes billable states only: Pending, Unpaid, Paid,
Failed, and Relieved. Cancelled invoices are not shown in this view.
*/

const getAdminBills = async (req, res) => {
    try {
        const { search = '', status = 'All', registrationStatus = 'All', month = '' } = req.query || {};
        const eventQuery = { price: { $gt: 0 } };
        const settings = await getPlatformSettings();

        if (month) {
            const { start, end } = resolveBillingWindow(month);
            eventQuery.$or = [
                { date: { $gte: start, $lt: end } },
                { datetime: { $gte: start, $lt: end } }
            ];
        }

        const paidEvents = await Event.find(eventQuery)
            .populate('creator', 'username email role')
            .select('title name price date datetime creator status')
            .lean();
        const paidEventIds = paidEvents.map((event) => event._id);
        const eventsById = paidEvents.reduce((acc, event) => {
            acc[event._id.toString()] = event;
            return acc;
        }, {});
        const registrations = await Registration.find({
            event: { $in: paidEventIds },
            status: { $in: BILLABLE_REGISTRATION_STATUSES }
        })
            .populate('participant', 'username email role')
            .sort({ createdAt: -1 })
            .lean();
        const billableRegistrationIds = registrations.map((registration) => registration._id);
        const invoices = await Invoice.find({
            event: { $in: paidEventIds },
            registration: { $in: billableRegistrationIds }
        })
            .populate('participant', 'username email role')
            .lean();
        const registrationsById = registrations.reduce((acc, registration) => {
            const key = getDocumentId(registration);
            if (key) {
                acc[key] = registration;
            }
            return acc;
        }, {});
        const invoicedRegistrationIds = new Set(
            invoices.map((invoice) => getDocumentId(invoice.registration))
        );
        const invoiceBills = invoices
            .filter((invoice) => BILLABLE_INVOICE_STATUSES.includes(getInvoiceStatus(invoice)))
            .map((invoice) => {
                const event = eventsById[getDocumentId(invoice.event)];
                const registration = registrationsById[getDocumentId(invoice.registration)];

                return billDto({
                    registration,
                    event,
                    invoice,
                    settings
                });
            });
        const pendingBills = registrations
            .filter((registration) => {
                return (
                    BILLABLE_REGISTRATION_STATUSES.includes(registration.status) &&
                    !invoicedRegistrationIds.has(getDocumentId(registration))
                );
            })
            .map((registration) => {
                const event = eventsById[registration.event.toString()];

                return billDto({
                    registration,
                    event,
                    invoice: null,
                    settings
                });
        });
        let bills = [...invoiceBills, ...pendingBills]
            .filter((bill) => BILLABLE_BILL_STATUSES.includes(bill.status));

        if (status && status !== 'All' && BILLABLE_BILL_STATUSES.includes(status)) {
            bills = bills.filter((bill) => bill.status === status);
        }

        if (
            registrationStatus &&
            registrationStatus !== 'All' &&
            BILLABLE_REGISTRATION_STATUSES.includes(registrationStatus)
        ) {
            bills = bills.filter((bill) => bill.registrationStatus === registrationStatus);
        }

        const searchRegex = buildRegex(search);
        const filteredBills = searchRegex
            ? bills.filter((bill) => {
                return (
                    searchRegex.test(bill.participant?.username || '') ||
                    searchRegex.test(bill.participant?.email || '') ||
                    searchRegex.test(bill.host?.username || '') ||
                    searchRegex.test(bill.host?.email || '') ||
                    searchRegex.test(bill.event?.title || '')
                );
            })
            : bills;

        res.json({
            bills: filteredBills.sort(compareByLatestDate)
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const relieveBill = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid bill id' });
        }

        let invoice = await Invoice.findById(req.params.id);
        let billRegistration;
        let statusBeforeRelief;

        if (!invoice) {
            const registration = await Registration.findById(req.params.id).populate('event', 'price date datetime status');
            if (!registration) {
                return res.status(404).json({ message: 'Bill not found' });
            }
            if (!BILLABLE_REGISTRATION_STATUSES.includes(registration.status)) {
                return res.status(400).json({ message: 'Only attended or late-cancelled bills can be relieved' });
            }

            billRegistration = registration;
            statusBeforeRelief = 'Pending';
            invoice = await Invoice.create({
                participant: registration.participant,
                event: registration.event._id,
                registration: registration._id,
                amount: buildBillAmount(registration, registration.event, await getPlatformSettings()),
                billingMonth: buildBillingMonth(registration.event.datetime || registration.event.date),
                status: 'Relieved',
                statusBeforeRelief: 'Pending',
                lastPaymentError: 'Relieved by admin from pending bill'
            });
        } else {
            if (invoice.status === 'Paid') {
                return res.status(400).json({ message: 'Paid bills cannot be relieved without a refund flow' });
            }
            if (!RELIEVABLE_INVOICE_STATUSES.includes(invoice.status)) {
                return res.status(400).json({ message: 'Only pending bills without invoices, unpaid invoices, or failed invoices can be relieved' });
            }
            statusBeforeRelief = invoice.status;
        }

        billRegistration = billRegistration || await Registration.findById(invoice.registration).select('status').lean();
        if (!billRegistration) {
            return res.status(404).json({ message: 'Bill registration not found' });
        }
        if (!BILLABLE_REGISTRATION_STATUSES.includes(billRegistration.status)) {
            return res.status(400).json({ message: 'Only attended or late-cancelled bills can be relieved' });
        }

        invoice.status = 'Relieved';
        invoice.statusBeforeRelief = invoice.statusBeforeRelief || statusBeforeRelief;
        invoice.lastPaymentError = invoice.lastPaymentError || 'Relieved by admin';
        invoice.paymentDate = null;
        await invoice.save();

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate('participant', 'username email role')
            .populate({
                path: 'event',
                select: 'title name price date datetime creator status',
                populate: { path: 'creator', select: 'username email role' }
            })
            .lean();
        const registration = await Registration.findById(populatedInvoice.registration)
            .populate('participant', 'username email role')
            .lean();

        res.json({
            message: 'Bill relieved',
            bill: billDto({
                registration,
                event: populatedInvoice.event,
                invoice: populatedInvoice,
                settings: await getPlatformSettings()
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const restoreBill = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid bill id' });
        }

        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Relieved bill not found' });
        }

        if (invoice.status !== 'Relieved') {
            return res.status(400).json({ message: 'Only relieved bills can be restored' });
        }

        const { end: restoreCutoff } = resolveBillingWindow(invoice.billingMonth);
        if (new Date() >= restoreCutoff) {
            return res.status(400).json({ message: 'Bills cannot be restored after their billing month has closed' });
        }

        const registration = await Registration.findById(invoice.registration)
            .populate('participant', 'username email role')
            .populate({
                path: 'event',
                select: 'title name price date datetime creator status',
                populate: { path: 'creator', select: 'username email role' }
            })
            .lean();
        if (!registration) {
            return res.status(404).json({ message: 'Bill registration not found' });
        }
        if (!BILLABLE_REGISTRATION_STATUSES.includes(registration.status)) {
            return res.status(400).json({ message: 'Only attended or late-cancelled bills can be restored' });
        }

        const previousStatus = invoice.statusBeforeRelief === 'Pending'
            ? 'Unpaid'
            : invoice.statusBeforeRelief || 'Unpaid';

        invoice.status = previousStatus;
        invoice.statusBeforeRelief = null;
        invoice.lastPaymentError = null;
        invoice.paymentDate = null;
        await invoice.save();

        res.json({
            message: 'Bill restored',
            bill: billDto({
                registration,
                event: registration.event,
                invoice: await Invoice.findById(invoice._id).lean(),
                settings: await getPlatformSettings()
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getAdminBills, relieveBill, restoreBill };
