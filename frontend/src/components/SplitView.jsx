import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from './Button';

/**
 * SplitView component (Master-Detail layout)
 * Props:
 * - items: Array of items
 * - selectedId: string | number
 * - onSelect: function(id)
 * - renderItem: function(item, isSelected)
 * - renderDetail: function(selectedItem)
 * - emptyDetailMessage: string
 */
export function SplitView({
  items = [],
  selectedId,
  onSelect,
  renderItem,
  renderDetail,
  emptyDetailMessage = 'Select an item to view details.',
  className = ''
}) {
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const selectedItem = items.find((it) => it.id === selectedId);

  const handleSelect = (id) => {
    if (onSelect) onSelect(id);
    setMobileShowDetail(true);
  };

  const handleBack = () => {
    setMobileShowDetail(false);
    if (onSelect) onSelect(null);
  };

  return (
    <div className={`mf-split-view ${mobileShowDetail ? 'mf-split-mobile-detail' : ''} ${className}`}>
      {/* Master list (Left column: always visible on desktop, toggled on mobile) */}
      <div className={`mf-split-list ${mobileShowDetail ? 'mf-mobile-hidden' : ''}`}>
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              className={`mf-split-item ${isSelected ? 'mf-split-item-active' : ''}`}
              onClick={() => handleSelect(item.id)}
            >
              {renderItem ? renderItem(item, isSelected) : (
                <div>{item.title || item.name || item.id}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel (Right column: always visible on desktop, toggled on mobile) */}
      <div className={`mf-split-detail ${!mobileShowDetail && !selectedItem ? 'mf-mobile-hidden' : ''}`}>
        {/* Back Button (accessible on both desktop and mobile to return to full customer list) */}
        {selectedItem && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              variant="link"
              onClick={handleBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <ArrowLeft size={16} /> Back to all customers
            </Button>
          </div>
        )}

        {selectedItem ? (
          renderDetail ? renderDetail(selectedItem) : <div>{JSON.stringify(selectedItem)}</div>
        ) : (
          <div className="mf-helper" style={{ textAlign: 'center', padding: '48px 0' }}>
            {emptyDetailMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default SplitView;

