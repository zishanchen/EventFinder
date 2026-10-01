import React, { useEffect, useState } from 'react';
import {
    createAdminBoost,
    createAdminTag,
    fetchAdminSettings,
    updateAdminBoost,
    updateAdminTag,
    updateLateCancellationWindow
} from '../../api/adminApi.js';
import { FALLBACK_TAG_COLORS, tagStyle } from '../../utils/tagPresentation.js';

const SETTINGS_SECTIONS = [
    { id: 'cancellation', label: 'Late Cancellation' },
    { id: 'tags', label: 'Tags' },
    { id: 'boosts', label: 'Boost Types' }
];

const TAG_CREATE_WARNINGS = new Set([
    'Tag name is required.',
    'A tag with this name already exists.'
]);

const BOOST_DUPLICATE_WARNING = 'A boost type with this name, length, and price already exists.';

const TAG_COLOR_FIELDS = [
    { key: 'background', label: 'Fill' },
    { key: 'border', label: 'Border' },
    { key: 'text', label: 'Text' }
];

const normalizeTagColorsForForm = (colors = {}) => ({
    background: colors.background || FALLBACK_TAG_COLORS.background,
    border: colors.border || FALLBACK_TAG_COLORS.border,
    text: colors.text || FALLBACK_TAG_COLORS.text
});

const normalizeTagForForm = (tag) => ({
    ...tag,
    colors: normalizeTagColorsForForm(tag.colors)
});

const validateBoost = (boost) => {
    const length = Number(boost.length);
    const price = Number(boost.price);

    if (!Number.isFinite(length) || length <= 0) {
        return 'Boost length must be greater than 0 hours.';
    }

    if (!Number.isFinite(price) || price < 0) {
        return 'Boost price cannot be less than 0.';
    }

    return null;
};

const getBoostFieldErrors = (boost) => {
    const lengthEmpty = boost.length === '' || boost.length === null || boost.length === undefined;
    const priceEmpty = boost.price === '' || boost.price === null || boost.price === undefined;
    const length = Number(boost.length);
    const price = Number(boost.price);

    return {
        length: !lengthEmpty && (!Number.isFinite(length) || length <= 0)
            ? 'Hours must be greater than 0.'
            : '',
        price: !priceEmpty && (!Number.isFinite(price) || price < 0)
            ? 'Price cannot be less than 0.'
            : ''
    };
};

const getLateCancellationFieldError = (value) => {
    if (value === '' || value === null || value === undefined) {
        return '';
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        return 'Days cannot be less than 0.';
    }

    if (!Number.isInteger(number)) {
        return 'Days must be a whole number.';
    }

    return '';
};

const getLateCancellationPercentFieldError = (value) => {
    if (value === '' || value === null || value === undefined) {
        return '';
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100) {
        return 'Percentage must be between 0 and 100.';
    }

    return '';
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const priceToCents = (value) => Math.round((Number(value) || 0) * 100);

const sortBoosts = (items) => {
    return [...items].sort((left, right) => {
        if (left.active !== right.active) return left.active ? -1 : 1;
        const priceComparison = Number(left.priceCents || 0) - Number(right.priceCents || 0);
        if (priceComparison !== 0) return priceComparison;
        return Number(left.length || 0) - Number(right.length || 0);
    });
};

const sortTags = (items) => {
    return [...items].sort((left, right) => {
        if ((left.active !== false) !== (right.active !== false)) {
            return left.active !== false ? -1 : 1;
        }

        return String(left.name || '').localeCompare(String(right.name || ''), undefined, {
            sensitivity: 'base'
        });
    });
};

export default function PlatformSettings({ token }) {
    const [activeSection, setActiveSection] = useState('cancellation');
    const [settings, setSettings] = useState({ lateCancellationWindowDays: 3, lateCancellationFeePercent: 50 });
    const [tags, setTags] = useState([]);
    const [boosts, setBoosts] = useState([]);
    const [newTag, setNewTag] = useState({
        name: '',
        colors: normalizeTagColorsForForm()
    });
    const [newBoost, setNewBoost] = useState({ name: '', length: 24, price: 2.99 });
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');

    const clearFeedbackIf = (messages) => {
        setFeedback(current => messages.has(current) ? '' : current);
    };

    const loadSettings = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await fetchAdminSettings(token);
            setSettings(data.settings);
            setTags((data.tags || []).map(normalizeTagForForm));
            setBoosts(data.boosts);
            setFeedback('');
        } catch (err) {
            setFeedback(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [token]);

    const lateCancellationValue = settings.lateCancellationWindowDays ?? '';
    const lateCancellationEmpty = lateCancellationValue === '';
    const lateCancellationNumber = Number(lateCancellationValue);
    const lateCancellationInvalid = !lateCancellationEmpty && (
        !Number.isFinite(lateCancellationNumber) ||
        lateCancellationNumber < 0 ||
        !Number.isInteger(lateCancellationNumber)
    );
    const lateCancellationFieldError = getLateCancellationFieldError(lateCancellationValue);
    const lateCancellationPercentValue = settings.lateCancellationFeePercent ?? '';
    const lateCancellationPercentEmpty = lateCancellationPercentValue === '';
    const lateCancellationPercentNumber = Number(lateCancellationPercentValue);
    const lateCancellationPercentInvalid = !lateCancellationPercentEmpty && (
        !Number.isFinite(lateCancellationPercentNumber) ||
        lateCancellationPercentNumber < 0 ||
        lateCancellationPercentNumber > 100
    );
    const lateCancellationPercentFieldError = getLateCancellationPercentFieldError(lateCancellationPercentValue);

    const saveCancellationWindow = async () => {
        if (lateCancellationEmpty || lateCancellationPercentEmpty) {
            setFeedback('Late cancellation settings cannot be empty.');
            return;
        }

        if (lateCancellationInvalid || lateCancellationPercentInvalid) {
            setFeedback(lateCancellationFieldError || lateCancellationPercentFieldError || 'Late cancellation settings are invalid.');
            return;
        }

        try {
            const data = await updateLateCancellationWindow(
                token,
                lateCancellationNumber,
                lateCancellationPercentNumber
            );
            setSettings(data);
            setFeedback('Cancellation window saved.');
        } catch (err) {
            setFeedback(err.message);
        }
    };

    const saveTag = async (tag) => {
        try {
            const normalizedName = normalizeText(tag.name);
            if (!normalizedName) {
                setFeedback('Tag name is required.');
                return;
            }
            if (tags.some(item => item._id !== tag._id && normalizeText(item.name) === normalizedName)) {
                setFeedback('A tag with this name already exists.');
                return;
            }

            const saved = await updateAdminTag(token, tag._id, {
                name: tag.name,
                colors: normalizeTagColorsForForm(tag.colors),
                active: tag.active !== false
            });
            setTags(current => sortTags(current.map(item => item._id === saved._id ? normalizeTagForForm(saved) : item)));
            setFeedback('Tag saved.');
        } catch (err) {
            setFeedback(err.message);
        }
    };

    const addTag = async () => {
        try {
            const normalizedName = normalizeText(newTag.name);
            if (!normalizedName) {
                setFeedback('Tag name is required.');
                return;
            }
            if (tags.some(tag => normalizeText(tag.name) === normalizedName)) {
                setFeedback('A tag with this name already exists.');
                return;
            }

            const tag = await createAdminTag(token, {
                name: newTag.name,
                colors: normalizeTagColorsForForm(newTag.colors)
            });
            setTags(current => sortTags([...current, normalizeTagForForm(tag)]));
            setNewTag({ name: '', colors: normalizeTagColorsForForm() });
            setFeedback('Tag created.');
        } catch (err) {
            setFeedback(err.message);
        }
    };

    const addBoost = async () => {
        try {
            const validationError = validateBoost(newBoost);
            if (validationError) {
                setFeedback(validationError);
                return;
            }

            const length = Number(newBoost.length);
            const priceCents = priceToCents(newBoost.price);
            const name = normalizeText(newBoost.name || `${length}-Hour Boost`);
            if (boosts.some(boost => (
                normalizeText(boost.name) === name &&
                Number(boost.length) === length &&
                Number(boost.priceCents ?? priceToCents(boost.price)) === priceCents
            ))) {
                setFeedback(BOOST_DUPLICATE_WARNING);
                return;
            }

            const boost = await createAdminBoost(token, newBoost);
            setBoosts(current => sortBoosts([...current, boost]));
            setNewBoost({ name: '', length: 24, price: 2.99 });
            setFeedback('Boost type created.');
        } catch (err) {
            setFeedback(err.message);
        }
    };

    const toggleTagActive = async (tag) => {
        const nextActive = tag.active === false;
        const action = nextActive ? 'reactivate' : 'deactivate';

        if (!window.confirm(`Are you sure you want to ${action} "${tag.name}"?`)) {
            return;
        }

        await saveTag({ ...tag, active: nextActive });
    };

    const updateTagDraft = (tagId, updates) => {
        setTags(current => current.map(tag => (
            tag._id === tagId
                ? { ...tag, ...updates }
                : tag
        )));
    };

    const updateTagColorDraft = (tagId, colorKey, value) => {
        setTags(current => current.map(tag => (
            tag._id === tagId
                ? {
                    ...tag,
                    colors: {
                        ...normalizeTagColorsForForm(tag.colors),
                        [colorKey]: value
                    }
                }
                : tag
        )));
    };

    const updateNewTagColor = (colorKey, value) => {
        setNewTag(current => ({
            ...current,
            colors: {
                ...normalizeTagColorsForForm(current.colors),
                [colorKey]: value
            }
        }));
    };

    const toggleBoostActive = async (boost) => {
        const nextActive = !boost.active;
        const action = nextActive ? 'reactivate' : 'deactivate';

        if (!window.confirm(`Are you sure you want to ${action} "${boost.name}"?`)) {
            return;
        }

        try {
            const saved = await updateAdminBoost(token, boost._id, { active: nextActive });
            setBoosts(current => sortBoosts(current.map(item => item._id === saved._id ? saved : item)));
            setFeedback('Boost type saved.');
        } catch (err) {
            setFeedback(err.message);
        }
    };

    if (loading) {
        return <p className="admin-empty">Loading settings...</p>;
    }

    const newBoostErrors = getBoostFieldErrors(newBoost);
    const newBoostInvalid = Boolean(newBoostErrors.length || newBoostErrors.price);

    return (
        <div className="admin-settings">
            <div className="admin-settings__tabs">
                {SETTINGS_SECTIONS.map(section => (
                    <button
                        key={section.id}
                        type="button"
                        className={`admin-settings__tab ${activeSection === section.id ? 'admin-settings__tab--active' : ''}`}
                        onClick={() => setActiveSection(section.id)}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            {feedback && <p className="admin-feedback">{feedback}</p>}

            {activeSection === 'cancellation' && (
            <section className="admin-settings__block">
                <h3>Late Cancellation</h3>
                <div className="admin-settings__inline">
                    <label>
                        <span>Days before event</span>
                        <input
                            className={`admin-input ${lateCancellationInvalid ? 'admin-input--error' : ''}`}
                            type="number"
                            min="0"
                            step="1"
                            aria-invalid={lateCancellationInvalid}
                            value={lateCancellationValue}
                            onChange={e => setSettings(current => ({
                                ...current,
                                lateCancellationWindowDays: e.target.value
                            }))}
                        />
                        {lateCancellationFieldError && (
                            <span className="admin-field-error">{lateCancellationFieldError}</span>
                        )}
                    </label>
                    <label>
                        <span>Fee percentage</span>
                        <input
                            className={`admin-input ${lateCancellationPercentInvalid ? 'admin-input--error' : ''}`}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            aria-invalid={lateCancellationPercentInvalid}
                            value={lateCancellationPercentValue}
                            onChange={e => setSettings(current => ({
                                ...current,
                                lateCancellationFeePercent: e.target.value
                            }))}
                        />
                        {!lateCancellationPercentEmpty && lateCancellationPercentFieldError && (
                            <span className="admin-field-error">{lateCancellationPercentFieldError}</span>
                        )}
                    </label>
                    <button className="admin-btn admin-btn--primary" onClick={saveCancellationWindow}>
                        Save
                    </button>
                </div>
            </section>
            )}

            {activeSection === 'tags' && (
            <section className="admin-settings__block">
                <h3>Tags</h3>
                <div className="admin-settings__create admin-settings__create--tag">
                    <input
                        className="admin-input"
                        placeholder="New tag name"
                        value={newTag.name}
                        onChange={e => {
                            const value = e.target.value;
                            setNewTag(current => ({ ...current, name: value }));
                            if (!value.trim()) clearFeedbackIf(TAG_CREATE_WARNINGS);
                        }}
                    />
                    <div className="admin-tag-colors" aria-label="New tag colors">
                        {TAG_COLOR_FIELDS.map(field => (
                            <label key={field.key} className="admin-color-field">
                                <span>{field.label}</span>
                                <input
                                    type="color"
                                    value={normalizeTagColorsForForm(newTag.colors)[field.key]}
                                    aria-label={`New tag ${field.label.toLowerCase()} color`}
                                    onChange={e => updateNewTagColor(field.key, e.target.value)}
                                />
                            </label>
                        ))}
                        <span className="admin-tag-preview" style={tagStyle(newTag)}>
                            {newTag.name.trim() || 'Preview'}
                        </span>
                    </div>
                    <button className="admin-btn admin-btn--primary" onClick={addTag}>
                        Create Tag
                    </button>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr><th>Name</th><th>Colors</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {tags.map(tag => (
                                <tr key={tag._id} className={tag.active === false ? 'admin-table__row--inactive' : ''}>
                                    <td>
                                        <input
                                            className="admin-input admin-tag-name-input"
                                            value={tag.name}
                                            aria-label={`Name for ${tag.name || 'tag'}`}
                                            onChange={e => {
                                                updateTagDraft(tag._id, { name: e.target.value });
                                                if (!e.target.value.trim()) clearFeedbackIf(TAG_CREATE_WARNINGS);
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <div className="admin-tag-colors">
                                            {TAG_COLOR_FIELDS.map(field => (
                                                <label key={field.key} className="admin-color-field">
                                                    <span>{field.label}</span>
                                                    <input
                                                        type="color"
                                                        value={normalizeTagColorsForForm(tag.colors)[field.key]}
                                                        aria-label={`${tag.name || 'Tag'} ${field.label.toLowerCase()} color`}
                                                        onChange={e => updateTagColorDraft(tag._id, field.key, e.target.value)}
                                                    />
                                                </label>
                                            ))}
                                            <span className="admin-tag-preview" style={tagStyle(tag)}>
                                                {tag.name || 'Preview'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${tag.active !== false ? 'admin-badge--green' : 'admin-badge--red'}`}>
                                            {tag.active !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-action-row">
                                            <button
                                                className="admin-btn admin-btn--sm admin-btn--primary"
                                                onClick={() => saveTag(tag)}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className={`admin-btn admin-btn--sm ${tag.active !== false ? 'admin-btn--muted' : 'admin-btn--approve'}`}
                                                onClick={() => toggleTagActive(tag)}
                                            >
                                                {tag.active !== false ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            )}

            {activeSection === 'boosts' && (
            <section className="admin-settings__block">
                <h3>Boost Types</h3>
                <div className="admin-settings__create admin-settings__create--boost">
                    <input
                        className="admin-input"
                        placeholder="Boost name"
                        value={newBoost.name}
                        onChange={e => {
                            const value = e.target.value;
                            setNewBoost(current => ({ ...current, name: value }));
                            if (!value.trim()) clearFeedbackIf(new Set([BOOST_DUPLICATE_WARNING]));
                        }}
                    />
                    <label className="admin-settings__field">
                        <span>Length in hours</span>
                        <input
                            className={`admin-input ${newBoostErrors.length ? 'admin-input--error' : ''}`}
                            type="number"
                            min="1"
                            step="1"
                            aria-label="Boost length in hours"
                            title="Length is calculated in hours"
                            placeholder="Length in hours"
                            value={newBoost.length}
                            onChange={e => {
                                const value = e.target.value;
                                setNewBoost(current => ({ ...current, length: value }));
                                if (value === '') clearFeedbackIf(new Set([BOOST_DUPLICATE_WARNING]));
                            }}
                        />
                        {newBoostErrors.length && <span className="admin-field-error">{newBoostErrors.length}</span>}
                    </label>
                    <label className="admin-settings__field">
                        <span>Price</span>
                        <input
                            className={`admin-input ${newBoostErrors.price ? 'admin-input--error' : ''}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={newBoost.price}
                            onChange={e => {
                                const value = e.target.value;
                                setNewBoost(current => ({ ...current, price: value }));
                                if (value === '') clearFeedbackIf(new Set([BOOST_DUPLICATE_WARNING]));
                            }}
                        />
                        {newBoostErrors.price && <span className="admin-field-error">{newBoostErrors.price}</span>}
                    </label>
                    <button className="admin-btn admin-btn--primary" onClick={addBoost} disabled={newBoostInvalid}>
                        Create Boost
                    </button>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr><th>Name</th><th>Length (hours)</th><th>Price</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {boosts.map(boost => (
                                <tr key={boost._id} className={!boost.active ? 'admin-table__row--inactive' : ''}>
                                    <td><strong>{boost.name}</strong></td>
                                    <td>{boost.length}</td>
                                    <td>€{Number(boost.price ?? Number(boost.priceCents || 0) / 100).toFixed(2)}</td>
                                    <td>
                                        <span className={`admin-badge ${boost.active ? 'admin-badge--green' : 'admin-badge--red'}`}>
                                            {boost.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-action-row">
                                            <button
                                                className={`admin-btn admin-btn--sm ${boost.active ? 'admin-btn--muted' : 'admin-btn--approve'}`}
                                                onClick={() => toggleBoostActive(boost)}
                                            >
                                                {boost.active ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            )}
        </div>
    );
}
