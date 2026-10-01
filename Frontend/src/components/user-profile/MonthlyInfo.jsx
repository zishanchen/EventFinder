import React, { useEffect, useState } from "react";
import { fetchInvoices, fetchMonthlyPaymentSummary } from "../../api/paymentApi.js";
import { useAuthContext } from "../../context/AuthContext.jsx";

const formatMoney = (amount, currency = "eur") => {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: currency.toUpperCase()
    }).format(Number(amount) || 0);
};

const formatDate = (date) => {
    if (!date) return "Date pending";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(new Date(date));
};

const PAYMENT_STATE_LABELS = {
    PendingInvoice: "Pending invoice",
    Unpaid: "Unpaid",
    Paid: "Paid",
    Failed: "Payment failed",
    Cancelled: "Cancelled",
    Relieved: "Relieved"
};

const formatPaymentState = (paymentState) => {
    return PAYMENT_STATE_LABELS[paymentState] || paymentState || PAYMENT_STATE_LABELS.PendingInvoice;
};

function MonthlyInfo() {
    const { token } = useAuthContext();
    const [monthlySummary, setMonthlySummary] = useState({
        billingMonth: "",
        estimatedTotal: 0,
        items: []
    });
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadMonthlyPayments = async () => {
            try {
                setLoading(true);
                setError("");
                const [summaryData, invoiceData] = await Promise.all([
                    fetchMonthlyPaymentSummary(token),
                    fetchInvoices(token)
                ]);
                setMonthlySummary(summaryData);
                setInvoices(invoiceData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            loadMonthlyPayments();
        } else {
            setLoading(false);
        }
    }, [token]);

    const monthlyItems = monthlySummary?.items || [];

    return (
        <section className="profile-card profile-monthly">
            <h2>This Month's Events & Payments</h2>

            {loading ? (
                <p>Loading payments...</p>
            ) : error ? (
                <p className="profile-payment__error">{error}</p>
            ) : (
                <>
                    <h3>Current Estimated Charges</h3>
                    {monthlyItems.length === 0 ? (
                        <p>No estimated charges for this month.</p>
                    ) : (
                        <div className="profile-monthly__list">
                            {monthlyItems.map((item, index) => (
                                <div className="profile-monthly__item" key={`${item.eventId}-${index}`}>
                                    <div className="profile-monthly__event">
                                        <h3>{item.title || "Event"}</h3>
                                        <p>{formatDate(item.datetime || item.date)} | {item.registrationStatus}</p>
                                    </div>
                                    <div className="profile-monthly__payment">
                                        <p>{formatMoney(item.amount, item.currency)}</p>
                                        <p>{formatPaymentState(item.paymentState)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="profile-monthly__total">
                        <span className="profile-monthly__total-title">Estimated Total</span>
                        <span className="profile-monthly__total-amount">
                            {formatMoney(monthlySummary?.estimatedTotal)}
                        </span>
                    </div>

                    <h3>Invoice History</h3>
                    {invoices.length === 0 ? (
                        <p>No invoices have been generated yet.</p>
                    ) : (
                        <div className="profile-monthly__list">
                            {invoices.map((invoice) => (
                                <div className="profile-monthly__item" key={invoice._id}>
                                    <div className="profile-monthly__event">
                                        <h3>{invoice.event?.title || "Event"}</h3>
                                        <p>{formatDate(invoice.event?.datetime || invoice.event?.date)}</p>
                                    </div>
                                    <div className="profile-monthly__payment">
                                        <p>{formatMoney(invoice.amount, invoice.currency)}</p>
                                        <p>{formatPaymentState(invoice.status)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    );

}
export default MonthlyInfo;
