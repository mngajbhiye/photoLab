import React, { useEffect } from "react";
import "./Ads.css";

interface AdsProps {
  side: "left" | "right";
  adClient: string;
  adSlot: string;
}

const Ads: React.FC<AdsProps> = ({ side, adClient, adSlot }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div className={`ad-${side}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default Ads;
