const CURRENT_YEAR = new Date().getFullYear();

export default function FiltersPanel({ filters, onChange, onClose }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="filters-panel">
      <div className="filters-row">
        <label>From year</label>
        <input
          type="number"
          min="1900"
          max={CURRENT_YEAR}
          value={filters.yearMin ?? ''}
          placeholder="Any"
          onChange={e => update('yearMin', e.target.value ? Number(e.target.value) : null)}
        />
        <label>To year</label>
        <input
          type="number"
          min="1900"
          max={CURRENT_YEAR}
          value={filters.yearMax ?? ''}
          placeholder="Any"
          onChange={e => update('yearMax', e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="filters-row">
        <label>Minimum rating: {filters.minRating ?? 0}</label>
        <input
          type="range"
          min="0"
          max="9"
          step="0.5"
          value={filters.minRating ?? 0}
          onChange={e => update('minRating', Number(e.target.value) || null)}
        />
      </div>
      <button className="back-btn" onClick={onClose}>Done</button>
    </div>
  );
}
