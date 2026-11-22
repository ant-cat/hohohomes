import "./info.css";

// Plain reading pages (how it works, city pages): a light header, the page, and a footer.
// Readable without JavaScript, so search engines and AI assistants can quote them.
export default function InfoLayout({ children }) {
  return (
    <div className="info">
      <header className="info-head">
        <a href="/" className="info-brand">
          HoHo<span>Homes</span>
        </a>
        <a href="/" className="info-cta">
          Open the map
        </a>
      </header>
      <main className="info-main">{children}</main>
      <footer className="info-foot">
        <a href="/">Map</a> · <a href="/about">How it works</a> · <a href="/lights">Lights by city</a>
        <span className="info-by">
          Made by <a href="https://ant.cat">Ant.Cat</a>. Map data ©{" "}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.
        </span>
      </footer>
    </div>
  );
}
