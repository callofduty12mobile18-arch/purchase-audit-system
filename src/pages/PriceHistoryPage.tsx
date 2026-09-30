import React, { useEffect, useState } from 'react';
import { TrendingUp, Search, ArrowRight, History } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { PriceHistory } from '../types';
import { dbService } from '../services/dbService';

export const PriceHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await dbService.getPriceHistory();
    const products = await dbService.getProducts();

    // Attach products if missing
    const enriched = data.map(ph => ({
      ...ph,
      product: ph.product || products.find(p => p.id === ph.product_id)
    }));

    setHistory(enriched);
    setLoading(false);
  };

  const filteredHistory = history.filter(ph =>
    (ph.product?.nickname && ph.product.nickname.toLowerCase().includes(search.toLowerCase())) ||
    (ph.product?.supplier_item_name && ph.product.supplier_item_name.toLowerCase().includes(search.toLowerCase())) ||
    ph.reason.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Product Alias',
      cell: (row: PriceHistory) => (
        <div>
          <span className="font-bold text-[#1F1F2C] block hover:text-[#4B49AC] transition-colors">{row.product?.nickname || 'Product'}</span>
          <span className="text-[11px] font-mono text-[#6C7383]">"{row.product?.supplier_item_name}"</span>
        </div>
      )
    },
    {
      header: 'Price Type',
      cell: (row: PriceHistory) => <Badge variant="purple">{row.price_type}</Badge>
    },
    {
      header: 'Old → New Rate',
      cell: (row: PriceHistory) => (
        <div className="flex items-center gap-2 font-mono text-xs font-semibold">
          <span className="text-[#6C7383] line-through">₹{row.old_value.toFixed(2)}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#4B49AC]" />
          <span className="text-[#4B49AC] font-bold">₹{row.new_value.toFixed(2)}</span>
        </div>
      )
    },
    {
      header: 'Audit Justification',
      cell: (row: PriceHistory) => (
        <span className="text-xs text-[#1F1F2C] italic">"{row.reason}"</span>
      )
    },
    {
      header: 'Timestamp',
      cell: (row: PriceHistory) => (
        <span className="font-mono text-xs text-[#6C7383]">{row.changed_at.replace('T', ' ').slice(0, 16)}</span>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-[#4B49AC]" />
          Price History Audit Trail
        </h1>
        <p className="page-subtitle">
          Immutable log of all product reference price adjustments and mandatory audit justifications
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash flex items-center gap-3">
        <div className="w-full max-w-md">
          <Input
            placeholder="Search by product alias or justification..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <span className="text-xs text-[#6C7383] font-mono hidden sm:inline-block ml-auto">
          {filteredHistory.length} Rate Adjustments Logged
        </span>
      </div>

      <Table
        columns={columns}
        data={filteredHistory}
        keyExtractor={(row) => row.id}
        isLoading={loading}
        emptyText="No price adjustments logged yet."
      />
    </div>
  );
};
