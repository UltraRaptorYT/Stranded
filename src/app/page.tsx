"use client";
import Image from "next/image";
import { useState } from "react";
const stages = [{ title: "Stranded" }, { title: "Situation" }];

export default function HomePage() {
  const [stageCounter, setStageCounter] = useState(0);
  return (
    <div className="flex relative fullHeight">
      <h1 className="text-center w-full text-6xl mt-8 font-extrabold text-[#005870] drop-shadow-sm">
        {stages[0].title}
      </h1>
      <div className="h-100 fixed left-0 bottom-10 z-30">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full aspect-200/267 object-contain palmSway"
        />
      </div>
      <div className="h-80 fixed right-10 bottom-15 z-10 -scale-x-100 rotate-20">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full aspect-200/267 object-contain palmSway"
        />
      </div>
      <div className="h-50 fixed right-0 rotate-30 bottom-10 z-10 -scale-x-100">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full aspect-200/267 object-contain palmSway"
        />
      </div>
      <div className="w-[120dvw] fixed bottom-0 left-1/2 -translate-x-1/2 z-20">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path
            fill="#fbe5bb"
            fillOpacity="1"
            d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
    </div>
  );
}
