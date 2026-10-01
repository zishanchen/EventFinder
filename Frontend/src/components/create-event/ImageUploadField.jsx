import React from 'react';
import CreateEventIcon from './CreateEventIcon.jsx';

function ImageUploadField({ imagePreview, imageName, onImageChange }) {
    return (
        <div className="create-event__field">
            <label>Event Image</label>
            <label className={`create-event__upload ${imagePreview ? 'create-event__upload--filled' : ''}`}>
                <input type="file" accept="image/png,image/jpeg,image/gif" onChange={onImageChange} />
                {imagePreview ? (
                    <>
                        <img src={imagePreview} alt="Selected event" />
                        <span>{imageName}</span>
                    </>
                ) : (
                    <span className="create-event__upload-content">
                        <CreateEventIcon name="upload" />
                        <strong>Click to upload or drag and drop</strong>
                        <small>PNG, JPG or WEBP (max. 5MB)</small>
                    </span>
                )}
            </label>
        </div>
    );
}

export default ImageUploadField;
