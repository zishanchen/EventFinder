import React from "react";
import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import FeaturedEvents from "../components/FeaturedEvents";
import MapRreview from "../components/MapReview";
import CTASection from "../components/CTASection";
import "../styles/home.css";

function Home() {
  return (
    <>
      <Navbar />

      <main>
        <HeroSection />
        <FeaturedEvents />
        <MapRreview />
        <CTASection />
      </main>
    </>
  );

}

export default Home;
