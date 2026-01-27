import React, { useState, useMemo } from 'react';
import { Area } from '../types';

interface AreaSelectorProps {
  areas: Area[];
  onSelect: (area: Area) => void;
}

export function AreaSelector({ areas, onSelect }: AreaSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) {
      return areas;
    }
    const query = searchQuery.trim().toLowerCase();
    return areas.filter(area =>
      area.name.toLowerCase().includes(query)
    );
  }, [areas, searchQuery]);

  // Group areas by migun time
  const groupedAreas = useMemo(() => {
    const groups: { [key: number]: Area[] } = {};
    filteredAreas.forEach(area => {
      if (!groups[area.migun_time]) {
        groups[area.migun_time] = [];
      }
      groups[area.migun_time].push(area);
    });
    return groups;
  }, [filteredAreas]);

  const migunTimeLabels: { [key: number]: string } = {
    15: 'עוטף עזה (15 שניות)',
    30: 'מערב הנגב / צפון (30 שניות)',
    45: 'אשדוד וסביבה (45 שניות)',
    60: 'חיפה והצפון / באר שבע (60 שניות)',
    90: 'מרכז הארץ (90 שניות)',
    180: 'אילת (3 דקות)'
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>טיימר מרחב מוגן</h1>
        <p style={styles.subtitle}>בחר את האזור שלך</p>
      </div>

      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="חיפוש אזור..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
          autoFocus
        />
      </div>

      <div style={styles.areaList}>
        {Object.keys(groupedAreas)
          .map(Number)
          .sort((a, b) => a - b)
          .map(migunTime => (
            <div key={migunTime} style={styles.group}>
              <h2 style={styles.groupTitle}>
                {migunTimeLabels[migunTime] || `${migunTime} שניות`}
              </h2>
              <div style={styles.areaGrid}>
                {groupedAreas[migunTime].map(area => (
                  <button
                    key={area.name}
                    onClick={() => onSelect(area)}
                    style={styles.areaButton}
                  >
                    <span style={styles.areaName}>{area.name}</span>
                    <span style={styles.areaTime}>{area.migun_time}״</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

        {filteredAreas.length === 0 && (
          <p style={styles.noResults}>לא נמצאו אזורים</p>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    color: '#ffffff'
  },
  header: {
    padding: '24px 16px 16px',
    textAlign: 'center',
    borderBottom: '1px solid #333'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#888'
  },
  searchContainer: {
    padding: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '18px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: '#2d2d44',
    color: '#ffffff',
    outline: 'none',
    textAlign: 'right'
  },
  areaList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 24px'
  },
  group: {
    marginBottom: '24px'
  },
  groupTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#888',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #333'
  },
  areaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  areaButton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
    textAlign: 'right',
    transition: 'background-color 0.2s'
  },
  areaName: {
    fontWeight: 500
  },
  areaTime: {
    color: '#888',
    fontSize: '14px'
  },
  noResults: {
    textAlign: 'center',
    color: '#888',
    padding: '40px'
  }
};
