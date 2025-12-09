// components/UsersTable.jsx
import { useState } from "react";
import TableDrawer from "@/components/TableDrawer";

export default function UsersTable({ users }) {
  const [selectedUserId, setSelectedUserId] = useState(null);

  const handleRowClick = (userId) => {
    setSelectedUserId(userId === selectedUserId ? null : userId);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-gray-700">
        <thead className="bg-gray-100 text-gray-800 uppercase text-xs">
          <tr>
            <th className="px-4 py-2">User ID</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <>
              <tr
                key={user.id}
                onClick={() => handleRowClick(user.id)}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2 font-medium">{user.id}</td>
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2 capitalize">{user.role}</td>
              </tr>

              {selectedUserId === user.id && (
                <tr key={`drawer-${user.id}`}>
                  <td colSpan={3} className="bg-gray-50 border-t">
                    <TableDrawer
                      isOpen={true}
                      onClose={() => setSelectedUserId(null)}
                      data={user}
                      type="user"
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
