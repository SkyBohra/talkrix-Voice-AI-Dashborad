'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showItemCount?: boolean;
  itemLabel?: string; // e.g., "campaigns", "calls", "agents"
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showItemCount = true,
  itemLabel = 'items',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5; // Max visible page numbers
    
    if (totalPages <= showPages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at the beginning
      if (currentPage <= 3) {
        startPage = 2;
        endPage = Math.min(showPages, totalPages - 1);
      }
      
      // Adjust if at the end
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - showPages + 1);
        endPage = totalPages - 1;
      }
      
      // Add ellipsis before if needed
      if (startPage > 2) {
        pages.push('ellipsis');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis after if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Item count display */}
      {showItemCount && (
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>
            Showing <span style={{ color: '#00C8FF', fontWeight: '600' }}>{startItem}</span>
            {' '}-{' '}
            <span style={{ color: '#00C8FF', fontWeight: '600' }}>{endItem}</span>
            {' '}of{' '}
            <span style={{ color: '#7800FF', fontWeight: '600' }}>{totalItems.toLocaleString()}</span>
            {' '}{itemLabel}
          </span>
        </div>
      )}

      {/* Pagination controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '8px 12px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* First page button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: currentPage === 1 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.background = 'rgba(0, 200, 255, 0.1)';
              e.currentTarget.style.color = '#00C8FF';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = currentPage === 1 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)';
          }}
        >
          <ChevronsLeft size={18} />
        </button>

        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: currentPage === 1 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.background = 'rgba(0, 200, 255, 0.1)';
              e.currentTarget.style.color = '#00C8FF';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = currentPage === 1 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)';
          }}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

        {/* Page numbers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <div
                  key={`ellipsis-${index}`}
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <MoreHorizontal size={16} />
                </div>
              );
            }

            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                style={{
                  minWidth: '36px',
                  height: '36px',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(0, 200, 255, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0, 200, 255, 0.1)';
                    e.currentTarget.style.color = '#00C8FF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: currentPage === totalPages ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.background = 'rgba(0, 200, 255, 0.1)';
              e.currentTarget.style.color = '#00C8FF';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = currentPage === totalPages ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)';
          }}
        >
          <ChevronRight size={18} />
        </button>

        {/* Last page button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: currentPage === totalPages ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.background = 'rgba(0, 200, 255, 0.1)';
              e.currentTarget.style.color = '#00C8FF';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = currentPage === totalPages ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)';
          }}
        >
          <ChevronsRight size={18} />
        </button>
      </div>

      {/* Quick page jump */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <span>Go to page:</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          defaultValue={currentPage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = parseInt((e.target as HTMLInputElement).value, 10);
              if (value >= 1 && value <= totalPages) {
                onPageChange(value);
              }
            }
          }}
          onBlur={(e) => {
            const value = parseInt(e.target.value, 10);
            if (value >= 1 && value <= totalPages && value !== currentPage) {
              onPageChange(value);
            } else {
              e.target.value = String(currentPage);
            }
          }}
          style={{
            width: '60px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(0, 200, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#FFFFFF',
            fontSize: '13px',
            textAlign: 'center',
            outline: 'none',
          }}
        />
        <span>of {totalPages}</span>
      </div>
    </div>
  );
}
