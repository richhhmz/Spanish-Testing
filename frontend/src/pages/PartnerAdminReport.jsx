import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import axios from '../api/AxiosClient';
import { DefaultHeader } from './DefaultHeader.jsx';
import { isDebug } from '../globals.js';
import { BackLog } from '../utils/BackLog';

function formatCurrency(amountInCents) {
  const value = Number(amountInCents || 0) / 100;

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

const PartnerAdminReport = () => {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState('');

  const [showPaymentPopup, setShowPaymentPopup] =
    useState(false);
  const [selectedPartner, setSelectedPartner] =
    useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submittingPayment, setSubmittingPayment] =
    useState(false);

  const amountInputRef = useRef(null);

  useEffect(() => {
    if (showPaymentPopup && amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, [showPaymentPopup]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError('');

      if (isDebug) {
        BackLog(
          '[PartnerAdminReport] before /partners-list'
        );
      }

      const res = await axios.get(
        '/api/stripe/partners-list'
      );

      const data = res.data?.data || [];

      setPartners(data);

      if (isDebug) {
        BackLog(
          `[PartnerAdminReport] partners count=${data.length}`
        );
      }
    } catch (err) {
      console.error(
        'Failed to load partners list:',
        err
      );

      setError(
        err.response?.data?.error ||
          'Failed to load partner admin report'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const openPaymentPopup = (partner) => {
    setSelectedPartner(partner);
    setPaymentAmount('');
    setShowPaymentPopup(true);
  };

  const closePaymentPopup = () => {
    setShowPaymentPopup(false);
    setSelectedPartner(null);
    setPaymentAmount('');
  };

  const submitPayment = async () => {
    try {
      setSubmittingPayment(true);
      setError('');

      await axios.post('/api/stripe/pay-partner', {
        partnerUserId:
          selectedPartner.partnerUserId,
        amountInCents: Number(paymentAmount),
      });

      closePaymentPopup();

      await fetchPartners();
    } catch (err) {
      console.error(
        'Failed to pay partner:',
        err
      );

      setError(
        err.response?.data?.error ||
          'Failed to submit partner payment'
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <DefaultHeader />

      <div className="w-full max-w-6xl bg-white shadow rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Partner Admin Report
        </h1>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {!error && partners.length === 0 && (
          <div className="text-center text-gray-600">
            No partners found.
          </div>
        )}

        {!error && partners.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Partner Name
                  </th>

                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Partner User ID
                  </th>

                  <th className="border border-gray-300 px-3 py-2 text-center">
                    Paid
                    <br />
                    This Month
                  </th>

                  <th className="border border-gray-300 px-3 py-2 text-center">
                    Paid
                    <br />
                    Amount
                  </th>

                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Balance
                  </th>
                </tr>
              </thead>

              <tbody>
                {partners.map((partner) => (
                  <tr
                    key={partner.partnerUserId}
                    className="hover:bg-blue-50"
                  >
                    <td className="border border-gray-300 px-3 py-2">
                      <a
                        href={`/partner-payment-report?partnerUserId=${encodeURIComponent(
                          partner.partnerUserId
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {partner.partnerName}
                      </a>
                    </td>

                    <td className="border border-gray-300 px-3 py-2">
                      {partner.partnerUserId}
                    </td>

                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {partner.paid ? 'Yes' : 'No'}
                    </td>

                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          openPaymentPopup(partner)
                        }
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {formatCurrency(
                          partner.paidAmount
                        )}
                      </button>
                    </td>

                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {formatCurrency(
                        partner.balance
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPaymentPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Enter partner payment amount
            </h2>

            <div className="mb-4 text-gray-700">
              {selectedPartner?.partnerName}
            </div>

            <input
              ref={amountInputRef}
              type="number"
              min="0"
              value={paymentAmount}
              onChange={(e) =>
                setPaymentAmount(e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 mb-6"
              placeholder="Amount in Cents"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closePaymentPopup}
                disabled={submittingPayment}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitPayment}
                disabled={
                  submittingPayment ||
                  paymentAmount === '' ||
                  Number(paymentAmount) < 0
                }
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerAdminReport;