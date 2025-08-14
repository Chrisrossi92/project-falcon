// src/components/settings/ProfileForm.jsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/Errors";
import { LoadingState } from "@/components/ui/Loaders";
import { useSession } from "@/lib/hooks/useSession";
import { fetchMyProfileAndSettings, saveProfileBasic, saveSettings } from "@/lib/api/users";
import { toast } from "react-hot-toast";

export default function ProfileForm() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!user?.id) return;
        const data = await fetchMyProfileAndSettings(user.id);
        if (!mounted) return;
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
        });
      } catch (e) {
        setErr(e.message || "Failed to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    try {
      if (!user?.id) return;
      await Promise.all([
        saveProfileBasic({ userId: user.id, name: form.name, email: form.email }),
        saveSettings({ userId: user.id, phone: form.phone }),
      ]);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  if (loading) return <LoadingState label="Loading profile…" />;
  if (err) return <ErrorState message={err} />;

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500">Name</label>
        <Input name="name" value={form.name} onChange={onChange} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">Email</label>
        <Input name="email" type="email" value={form.email} onChange={onChange} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">Phone</label>
        <Input name="phone" value={form.phone} onChange={onChange} />
      </div>
      <div className="pt-2">
        <Button type="submit">Save Profile</Button>
      </div>
    </form>
  );
}

