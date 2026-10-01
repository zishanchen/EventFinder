import React from "react";
import { useNavigate } from "react-router-dom";
import CreateEventIcon from "./create-event/CreateEventIcon";

export default function GoBackButton() {
    const navigate = useNavigate();

    return (
        <button 
            type = "button"
            className="go-back-button" 
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Go back"
        >
            <CreateEventIcon name="arrow" />
        </button>
    )
}