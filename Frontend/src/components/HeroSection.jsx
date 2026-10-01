import React, { use } from "react";
import {useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { fetchTags } from "../api/eventApi.js";
import CreateEventIcon from "./create-event/CreateEventIcon.jsx";


const TAG_STYLE_MAP = {
    "Free Food": { icon: "food", className: "chip--food" },
    "Sports": { icon: "ball", className: "chip--sports" },
    "Networking": { icon: "briefcase", className: "chip--networking" },
    "Tech": { icon: "laptop", className: "chip--tech" },
    "Party": { icon: "music", className: "chip--party" },
    "Study Group": { icon: "book", className: "chip--study" },
  };

const DEFAULT_TAG_STYLE = {
    icon: "tag",
    className: "chip--tech",
};

function HeroSection() {
    
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadTags = async () => {
                try {
                    const tags = await fetchTags();

                    if(!isMounted) return;

                    setCategories(tags.map(tag => tag.name)
                                    .filter(Boolean)
                                    .slice(0, 6)
                );
                }
                catch {
                    if(isMounted) {
                        setCategories([]);
                    }
                }
            };

            loadTags();

            return () => {
                isMounted = false;
            };
    },[]);
   
    const handleCategoryClick = (tag) => {
        navigate(`/discover?tag=${encodeURIComponent(tag)}`);
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();

        const keyword = searchTerm.trim();

        if (keyword) {
            navigate(`/discover?search=${encodeURIComponent(keyword)}`);
        } else {
            navigate('/discover');
        }
    }


    return (
        <section className="hero">
            <div className="hero__content"> 
                <h1>
                    Discover Student Events{" "}
                    <span className="hero__gradient-text">Across Munich</span>
                </h1>

                <p className ="hero__subtitle">   
                    Find and join student events in Munich.
                </p>

                <form className="hero_search" onSubmit={handleSearchSubmit}>
                    <span className="hero__search-icon" aria-hidden="true">
                        <CreateEventIcon name="search" />
                    </span>
                    <input
                        type = "text"
                        placeholder = "Search for events, clubs, or locations"
                        aria-label = "Search events"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                    <button type = "submit">
                        <CreateEventIcon name="search" />
                        Search
                    </button>
                </form>

                <div className = "hero_categories" role = "group" aria-label = "Event categories">
                    {categories.map((category) => {
                        const tagStyle = TAG_STYLE_MAP[category] || DEFAULT_TAG_STYLE;

                        return (
                            <button
                                type="button"
                                className={`hero__chip ${tagStyle.className}`}
                                key={category}
                                onClick={() => handleCategoryClick(category)}>

                                <span className="hero__chip-icon">
                                    <CreateEventIcon name={tagStyle.icon} />
                                </span>
                                <span className="hero__chip-label">{category}</span>
                            </button>
                            
                        );
                    })}
                </div>
            </div>

        </section>
    );
}

export default HeroSection;
