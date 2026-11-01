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

  return (
    <div className={`mf-split-view ${className}`}>
      {/* Master list */}
      <div
        className="mf-split-list"
        style={{
          display: mobileShowDetail ? 'none' : 'flex'
        }}
      >
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

      {/* Detail panel */}
      <div
        className="mf-split-detail"
        style={{
          display: mobileShowDetail ? 'block' : undefined
        }}
      >
        {/* Mobile Back Button */}
        <div className="mf-mobile-only" style={{ marginBottom: '16px' }}>
          <Button
            variant="link"
            onClick={() => setMobileShowDetail(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back to list
          </Button>
        </div>

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

