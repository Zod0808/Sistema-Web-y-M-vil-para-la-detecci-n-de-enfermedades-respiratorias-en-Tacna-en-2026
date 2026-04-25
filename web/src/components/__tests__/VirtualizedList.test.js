import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VirtualizedList from '../VirtualizedList';

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }) => children({ height: 200, width: 300 }),
}));

jest.mock('react-window', () => ({
  FixedSizeList: ({ itemCount, itemData, children, height, width }) => (
    <div data-testid="mock-react-window" data-height={height} data-width={width}>
      {Array.from({ length: itemCount }).map((_, index) =>
        children({ index, style: { top: index * 10 }, data: itemData })
      )}
    </div>
  ),
}));

describe('VirtualizedList', () => {
  it('retorna null cuando no hay elementos', () => {
    const { container } = render(
      <VirtualizedList items={[]} itemHeight={50} renderItem={() => null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la lista virtualizada con los elementos proporcionados', () => {
    const renderItem = jest.fn((item) => <div data-testid="item">{item.label}</div>);
    const items = [
      { id: 1, label: 'Zona A' },
      { id: 2, label: 'Zona B' },
      { id: 3, label: 'Zona C' },
      { id: 4, label: 'Zona D' },
    ];

    const { container } = render(
      <VirtualizedList
        items={items}
        itemHeight={40}
        maxVisibleItems={3}
        renderItem={renderItem}
      />
    );

    expect(screen.getByTestId('mock-react-window')).toHaveAttribute('data-height', '200');
    expect(renderItem).toHaveBeenCalledTimes(items.length);
    expect(screen.getAllByTestId('item')).toHaveLength(items.length);
    expect(container.firstChild).toHaveClass('virtualized-list');
    expect(container.firstChild).toHaveStyle({ height: `${3 * 40}px` });
  });
});

