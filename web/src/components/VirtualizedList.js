import React, { memo } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

function VirtualizedList({
  items,
  itemHeight,
  maxVisibleItems = 6,
  overscanCount = 3,
  renderItem,
  className = ''
}) {
  if (!items || items.length === 0) {
    return null;
  }

  const containerHeight = Math.min(items.length, maxVisibleItems) * itemHeight || itemHeight;

  return (
    <div
      className={`virtualized-list ${className}`}
      style={{ height: containerHeight }}
    >
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={itemHeight}
            overscanCount={overscanCount}
            itemData={{ items, renderItem }}
          >
            {({ index, style, data }) => {
              const item = data.items[index];
              if (!item) {
                return null;
              }
              return (
                <div style={style}>
                  {data.renderItem(item, index)}
                </div>
              );
            }}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

export default memo(VirtualizedList);

