// src/pages/UserDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/Errors";
import { LoadingState } from "@/components/ui/Loaders";
import { toast } from "react-hot-toast";

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, display_name, email, phone, avatar_url")
          .eq("id", userId)
          .single();
        if (error) throw error;
        if (mounted) setRow(data);
      } catch (e) {
        setErr(e.message || "User not found");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setRow((s) => ({ ...s, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    try {
      const patch = {
        name: row.name ?? null,
        display_name: row.display_name ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        avatar_url: row.avatar_url ?? null,
      };
      const { error } = await supabase.from("users").update(patch).eq("id", row.id);
      if (error) throw error;
      toast.success("User updated");
      navigate("/users");
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  if (loading) return <LoadingState label="Loading user…" />;
  if (err) return <ErrorState message={err} />;

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit User</h1>
        <p className="text-sm text-gray-500">ID: {row.id}</p>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500">Display Name</label>
          <input
            name="display_name"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={row.display_name || ""}
            onChange={onChange}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Legal Name</label>
          <input
            name="name"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={row.name || ""}
            onChange={onChange}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Email</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={row.email || ""}
            onChange={onChange}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Phone</label>
          <input
            name="phone"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={row.phone || ""}
            onChange={onChange}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">Avatar URL</label>
          <input
            name="avatar_url"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={row.avatar_url || ""}
            onChange={onChange}
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={()=>navigate(-1)}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}



