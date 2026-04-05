import { useEffect, useState } from 'react';
import axios from '../api/AxiosClient';
import { BackLog } from '../utils/BackLog';
import { isDebug } from '../globals.js';

export default function SubscriptionPaymentsReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDebug) BackLog("[SubscriptionPaymentsReport] begin");

    let cancelled = false;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await axios.get('/api/billing/subscription-payments-report');

        if (!cancelled) {
          setRows(res.data?.data || []);
        }
      } catch (err) {
        console.error('Failed to load subscription payments report:', err);
        if (!cancelled) {
          setError(
            err?.response?.data?.error || 'Failed to load subscription payments report.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString();
  };

  const formatAmount = (amount, currency = 'usd') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: String(currency || 'usd').toUpperCase(),
      }).format(Number(amount || 0));
    } catch {
      return `${amount} ${String(currency || '').toUpperCase()}`;
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Subscription Payments Report</h1>

      {loading && <p>Loading report...</p>}

      {!loading && error && (
        <div
          style={{
            background: '#ffeaea',
            border: '1px solid #ffb3b3',
            color: '#8a1f1f',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && <p>No paid subscription invoices found.</p>}

      {!loading && !error && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '700px',
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Payment Date</th>
                <th style={thStyle}>Subscriber Email</th>
                <th style={thStyle}>Payment Amount</th>
                <th style={thStyle}>Currency</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.invoiceId}>
                  <td style={tdStyle}>{formatDate(row.paymentDate)}</td>
                  <td style={tdStyle}>{row.subscriberEmail || ''}</td>
                  <td style={tdStyle}>{formatAmount(row.paymentAmount, row.currency)}</td>
                  <td style={tdStyle}>{String(row.currency || '').toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  borderBottom: '1px solid #ccc',
  padding: '0.75rem',
  background: '#f7f7f7',
};

const tdStyle = {
  textAlign: 'left',
  borderBottom: '1px solid #eee',
  padding: '0.75rem',
};