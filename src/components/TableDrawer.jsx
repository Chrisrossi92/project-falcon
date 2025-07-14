// components/TableDrawer.jsx
import OrderDrawerContent from "@/components/orders/OrderDrawerContent";
import ClientDrawerContent from "@/components/clients/ClientDrawerContent";
import UserDrawerContent from "@/components/users/UserDrawerContent";

export default function TableDrawer({ isOpen, onClose, data, type }) {
  if (!isOpen || !data) return null;

  let Content;
  switch (type) {
    case "order":
      Content = OrderDrawerContent;
      break;
    case "client":
      Content = ClientDrawerContent;
      break;
    case "user":
      Content = UserDrawerContent;
      break;
    default:
      return null;
  }

  return (
    <div className="p-4 border rounded shadow-inner bg-white">
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          Close
        </button>
      </div>
      <Content data={data} />
    </div>
  );
}



