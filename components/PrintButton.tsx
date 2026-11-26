"use client";
export default function PrintButton() { return <button className="noprint" onClick={() => window.print()}>Print / save as PDF</button>; }
