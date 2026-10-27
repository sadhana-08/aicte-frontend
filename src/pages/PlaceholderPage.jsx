import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }) {
  return (
    <section className="placeholder-page">
      <span className="placeholder-icon"><Construction size={22} strokeWidth={1.7} /></span>
      <p className="eyebrow">WORKSPACE SECTION</p>
      <h2>{title}</h2>
      <p>Coming soon</p>
    </section>
  );
}
