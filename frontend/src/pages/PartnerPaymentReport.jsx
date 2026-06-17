import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/AxiosClient';
import { isDebug } from '../globals.js';
import { BackLog } from '../utils/BackLog';
import { DefaultHeader } from './DefaultHeader.jsx';

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(yyyyMm, delta) {
  const [year, month] = yyyyMm.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return d.toISOString().slice(0, 7);
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }

  return (value / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function stripEmailEnding(name = '') {
  return name.replace(/@.*$/, '').trim();
}

function displayType(transactionType) {
  switch (transactionType) {
    case 'subscriberPayment':
      return 'Subscriber';
    case 'partnerPayment':
      return 'Partner';
    case 'monthBegin':
      return 'Beginning Balance';
    case 'monthEnd':
      return 'Ending Balance';
    default:
      return transactionType;
  }
}

export function PartnerPaymentReport() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [payments, setPayments] = useState([]);
  const [memberCounts, setMemberCounts] = useState(null);

  const [loading, setLoading] = useState(false);
  const [countsLoading, setCountsLoading] = useState(false);

  const [error, setError] = useState('');
  const [countsError, setCountsError] = useState('');

  const searchParams = new URLSearchParams(window.location.search);
  const partnerUserId = searchParams.get('partnerUserId');

  const currentMonth = getCurrentMonth();
  const isCurrentMonth = month === currentMonth;

  useEffect(() => {
    async function loadPayments() {
      setLoading(true);
      setError('');

      try {
        const params = { month };

        if (partnerUserId) {
          params.partnerUserId = partnerUserId;
        }

        const res = await axios.get('/api/stripe/partner-payments', {
          params,
        });

        if (isDebug) {
          BackLog(
            `[PartnerPaymentReport] payments=${JSON.stringify(
              res.data?.data,
              null,
              2
            )}`
          );
        }

        setPayments(res.data?.data || []);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.error ||
            'Unable to load partner payment report.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [month, partnerUserId]);

  useEffect(() => {
    async function loadMemberCounts() {
      setMemberCounts(null);
      setCountsError('');

      if (!isCurrentMonth) {
        return;
      }

      setCountsLoading(true);

      try {
        const params = {};

        if (partnerUserId) {
          params.partnerUserId = partnerUserId;
        }

        const res = await axios.get('/api/stripe/partner-counts', {
          params,
        });

        if (isDebug) {
          BackLog(
            `[PartnerPaymentReport] memberCounts=${JSON.stringify(
              res.data,
              null,
              2
            )}`
          );
        }

        setMemberCounts(res.data || {});
      } catch (err) {
        console.error(err);
        setCountsError(
          err.response?.data?.error ||
            'Unable to load partner member counts.'
        );
      } finally {
        setCountsLoading(false);
      }
    }

    loadMemberCounts();
  }, [isCurrentMonth, partnerUserId]);

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) =>
      String(a.transactionDateAndTimeISO).localeCompare(
        String(b.transactionDateAndTimeISO)
      )
    );
  }, [payments]);

  const partnerName =
    sortedPayments.find((p) => p.partnerName)?.partnerName || '';

  const canGoPrevious = true;
  const canGoNext = month < currentMonth;

  let runningBalance = 0;

  const reportRows = sortedPayments.map((payment) => {
    const isMonthBegin = payment.transactionType === 'monthBegin';
    const isMonthEnd = payment.transactionType === 'monthEnd';
    const isPartnerPayment = payment.transactionType === 'partnerPayment';

    if (isMonthBegin) {
      runningBalance = payment.partnerAmount || 0;
    } else if (!isMonthEnd) {
      if (isPartnerPayment) {
        runningBalance -= payment.partnerAmount || 0;
      } else {
        runningBalance += payment.partnerAmount || 0;
      }
    }

    const balance = isMonthEnd ? payment.partnerAmount : runningBalance;

    const payName =
      payment.transactionType === 'subscriberPayment'
        ? payment.isTestAccount
          ? payment.userPreferredName || ''
          : stripEmailEnding(payment.subscriberName || '')
        : payment.partnerName || '';

    return {
      ...payment,
      date:
        isMonthBegin || isMonthEnd
          ? ''
          : payment.transactionDateAndTimeISO?.slice(0, 10),
      typeDisplay: displayType(payment.transactionType),
      payName,
      balance,
      isMonthBegin,
      isMonthEnd,
    };
  });

  const countRows = [
    { label: 'members', count: memberCounts?.totalMembers },
    { label: 'subscribed', count: memberCounts?.totalSubscribed },
    { label: 'in trial', count: memberCounts?.totalInTrial },
    {
      label: 'trial expired and not subscribed',
      count: memberCounts?.totalTrialExpiredAndNotSubscribed,
    },
    { label: 'subscription canceled', count: memberCounts?.totalCanceled },
  ];

  return (
    <div>
      <DefaultHeader />

      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">
            Partner Payment Report
          </h1>

          <div className="text-gray-600">
            {partnerName && <span>{partnerName} — </span>}
            Month {month}
          </div>

          {partnerUserId && (
            <div className="text-sm text-gray-500">
              Partner User ID: {partnerUserId}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            disabled={!canGoPrevious}
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-40"
          >
            Previous
          </button>

          <div className="font-semibold">{month}</div>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>

        {loading && <div>Loading...</div>}

        {error && (
          <div className="mb-4 text-red-600 font-semibold">
            {error}
          </div>
        )}

        {!loading && !error && reportRows.length === 0 && (
          <div>No partner payments found for {month}.</div>
        )}

        {!loading && !error && reportRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left">
                    Date
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-left">
                    Type
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-left">
                    Name
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-right">
                    Subscriber<br />Amount
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-right">
                    Partner<br />Share
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-right">
                    Partner<br />Amount
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-right">
                    Balance
                  </th>
                </tr>
              </thead>

              <tbody>
                {reportRows.map((row, index) => (
                  <tr
                    key={`${row.transactionDateAndTimeISO}-${row.transactionType}-${index}`}
                    className={
                      row.isMonthBegin
                        ? 'bg-blue-50 font-semibold'
                        : row.isMonthEnd
                          ? 'bg-green-50 font-semibold'
                          : ''
                    }
                  >
                    <td className="border border-gray-300 px-2 py-2">
                      {row.date}
                    </td>

                    <td className="border border-gray-300 px-2 py-2">
                      {row.typeDisplay}
                    </td>

                    <td className="border border-gray-300 px-2 py-2">
                      {row.payName}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {row.isMonthBegin || row.isMonthEnd
                        ? ''
                        : formatMoney(row.subscriberAmount)}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {row.isMonthBegin ||
                      row.isMonthEnd ||
                      row.transactionType === 'partnerPayment'
                        ? ''
                        : `${row.partnerPercent}%`}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {row.isMonthBegin || row.isMonthEnd
                        ? ''
                        : formatMoney(row.partnerAmount)}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatMoney(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isCurrentMonth && (
          <div className="mt-4">
            <h2 className="text-base font-bold mb-1">
              Member counts for {partnerName || 'partner'}
            </h2>

            {countsLoading && (
              <div className="text-sm">Loading member counts...</div>
            )}

            {countsError && (
              <div className="mb-2 text-red-600 font-semibold text-sm">
                {countsError}
              </div>
            )}

            {!countsLoading && !countsError && (
              <table className="text-sm border-collapse">
                <tbody>
                  {countRows.map((row) => (
                    <tr key={row.label}>
                      <td className="py-0.5 pr-3 text-right font-semibold">
                        {row.count ?? 0}
                      </td>

                      <td className="py-0.5">
                        {row.label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}