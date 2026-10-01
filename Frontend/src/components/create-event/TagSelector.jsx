import React from 'react';
import CreateEventIcon from './CreateEventIcon.jsx';
import { getTagName, tagStyle } from '../../utils/tagPresentation.js';

function TagSelector({ status, tags, selectedTags, onToggle, error = '', showError = false }) {
    return (
        <fieldset
            className={`create-event__field create-event__fieldset ${showError ? 'create-event__fieldset--invalid' : ''}`}
            aria-invalid={showError}
            aria-describedby={showError ? 'event-tags-error' : undefined}
        >
            <legend className="create-event__icon-label">
                <CreateEventIcon name="tag" />
                <span>Tags</span>
            </legend>
            <div className="create-event__tags">
                {status === 'loading' && (
                    <p className="create-event__tag-message">Loading tags...</p>
                )}
                {status === 'error' && (
                    <p className="create-event__tag-message create-event__tag-message--error">
                        Tags could not be loaded. Check that the backend is running.
                    </p>
                )}
                {status === 'ready' && tags.map((tag) => {
                    const tagName = getTagName(tag);

                    return (
                    <button
                        key={tagName}
                        type="button"
                        className={`create-event__tag ${selectedTags.includes(tagName) ? 'create-event__tag--active' : ''}`}
                        style={tagStyle(tag)}
                        onClick={() => onToggle(tagName)}
                    >
                        <CreateEventIcon name="plus" />
                        <span>{tagName}</span>
                    </button>
                );
                })}
            </div>
            {showError && (
                <p id="event-tags-error" className="create-event__field-error" role="alert">
                    {error}
                </p>
            )}
        </fieldset>
    );
}

export default TagSelector;
