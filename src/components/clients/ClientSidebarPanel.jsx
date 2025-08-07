import React from 'react';
import { Doughnut } from 'react-chartjs-2';

const ClientSidebarPanel = ({ stats, hasData, chartData, isNewClient, onRefresh, clientType }) => {
  return (
    <div className="w-1/3 p-4">
      <h3 className="text-lg font-semibold">Client Stats</h3>

      {/* Dynamic stat summary label */}
      {!isNewClient && (
        <p className="text-xs text-gray-500 mt-1">
          {stats.total === 0
            ? "No recorded orders yet."
            : clientType === 'AMC'
              ? "Showing all orders from lenders under this AMC."
              : "Showing only orders directly assigned to this client."}
        </p>
      )}

      <div className="mt-2 max-h-64 overflow-hidden">
        {isNewClient ? (
          <p className="text-center text-gray-500">
            New Client - Stats will appear after creation and orders are added.
          </p>
        ) : hasData ? (
          <Doughnut
            data={chartData}
            options={{
              responsive: true,
              cutout: '60%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { font: { size: 12 } }
                }
              }
            }}
            height={150}
          />
        ) : (
          <p className="text-center text-gray-500">No orders yet—time to get some action.</p>
        )}
      </div>

      <ul className="mt-4 space-y-1 text-sm">
        <li>Avg Fee: ${stats.avgFee.toFixed(2)}</li>
      </ul>

      {!isNewClient && (
        <button
          onClick={onRefresh}
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          Refresh Stats
        </button>
      )}
    </div>
  );
};

export default ClientSidebarPanel;
