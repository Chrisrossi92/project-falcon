// src/components/users/UserCard.jsx
import React, { useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

const UserCard = ({ user }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ ...user, phone: user.phone || '', email: user.email || '', licenses: user.licenses || [] });
  const [licenseFiles, setLicenseFiles] = useState([]);

  const handleFlip = () => {
    if (isEditing) return; // Prevent flip during edit
    setIsFlipped(!isFlipped);
  };

  const handleEdit = (e) => {
    e.stopPropagation(); // Prevent flip
    setIsEditing(true);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setEditedUser({ ...user, phone: user.phone || '', email: user.email || '', licenses: user.licenses || [] });
    setIsEditing(false);
    setLicenseFiles([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleLicenseUpload = (e) => {
    setLicenseFiles(Array.from(e.target.files));
  };

  const uploadLicenses = async () => {
    const uploadedPaths = [];
    for (const file of licenseFiles) {
      const { data, error } = await supabase.storage
        .from('licenses') // Assume 'licenses' bucket; create in Supabase if needed
        .upload(`${user.id}/${file.name}`, file);

      if (error) throw error;
      uploadedPaths.push(data.path);
    }
    return uploadedPaths;
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    try {
      let newLicenses = editedUser.licenses;

      if (licenseFiles.length > 0) {
        const uploaded = await uploadLicenses();
        newLicenses = [...newLicenses, ...uploaded];
      }

      const updateData = { ...editedUser, licenses: newLicenses };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;
      toast.success('User updated!');
      setIsEditing(false);
      // Update local user to reflect changes without refresh
      Object.assign(user, updateData);
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update user.');
    }
  };

  // Fun placeholder: Random animal image
  const placeholderImages = [
    'https://randomfox.ca/images/' + Math.floor(Math.random() * 123 + 1) + '.jpg',
    'https://placekitten.com/200/200?image=' + Math.floor(Math.random() * 16),
    'https://placedog.net/200/200?random'
  ];
  const randomPlaceholder = placeholderImages[Math.floor(Math.random() * placeholderImages.length)];

  const photoUrl = user.photo_url || randomPlaceholder;

  return (
    <div className="relative w-64 h-80 [perspective:1000px] cursor-pointer">
      <div
        className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* Front Side */}
        <div 
          className="absolute w-full h-full [backface-visibility:hidden] bg-white rounded-lg shadow-md flex flex-col items-center justify-center p-4"
          onClick={handleFlip}
        >
          <img
            src={photoUrl}
            alt={user.name}
            className="w-32 h-32 rounded-full object-cover mb-4"
          />
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.role}</p>
        </div>

        {/* Back Side */}
        <div 
          className="absolute w-full h-full [backface-visibility:hidden] bg-white rounded-lg shadow-md flex flex-col p-4 [transform:rotateY(180deg)] overflow-y-auto"
        >
          <h3 className="text-lg font-semibold mb-2">{user.name} Details</h3>

          {isEditing ? (
            <>
              <label className="block text-sm">Name</label>
              <input
                name="name"
                value={editedUser.name}
                onChange={handleChange}
                className="w-full border rounded p-1 mb-2"
              />

              <label className="block text-sm">Role</label>
              <select
                name="role"
                value={editedUser.role}
                onChange={handleChange}
                className="w-full border rounded p-1 mb-2"
              >
                <option>Admin</option>
                <option>Appraiser</option>
                <option>Reviewer</option>
              </select>

              <label className="block text-sm">Email</label>
              <input
                name="email"
                value={editedUser.email}
                onChange={handleChange}
                className="w-full border rounded p-1 mb-2"
              />

              <label className="block text-sm">Phone</label>
              <input
                name="phone"
                value={editedUser.phone}
                onChange={handleChange}
                className="w-full border rounded p-1 mb-2"
              />

              <label className="block text-sm">Upload Licenses</label>
              <input
                type="file"
                multiple
                onChange={handleLicenseUpload}
                className="w-full mb-2"
              />

              <div className="flex justify-end mt-auto gap-2">
                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-4 py-1 rounded"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-300 px-4 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm mb-1"><strong>Role:</strong> {user.role}</p>
              <p className="text-sm mb-1"><strong>Email:</strong> {user.email || 'N/A'}</p>
              <p className="text-sm mb-1"><strong>Phone:</strong> {user.phone || 'N/A'}</p>

              <label className="block text-sm font-medium mt-2">Licenses</label>
              {user.licenses && user.licenses.length > 0 ? (
                <ul className="list-disc pl-4 text-sm">
                  {user.licenses.map((path, idx) => (
                    <li key={idx}>
                      <a
                        href={supabase.storage.from('licenses').getPublicUrl(path).data.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        License {idx + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No licenses uploaded.</p>
              )}

              <div className="flex justify-end mt-auto">
                <button
                  onClick={handleEdit}
                  className="bg-green-600 text-white px-4 py-1 rounded"
                >
                  Edit Details
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;