"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TeamMember } from "@/lib/mock-data/team";
import { teamMemberFormSchema, type TeamMemberFormValues } from "@/lib/schemas";
import type { TeamMemberInput } from "@/lib/team-store";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80";

export function TeamMemberFormDialog({
  open,
  onOpenChange,
  member,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
  onSave: (input: TeamMemberInput) => void;
}) {
  const [preview, setPreview] = useState<string>("");
  const isEdit = Boolean(member);

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      fullName: "",
      role: "",
      bio: "",
      email: "",
      linkedinUrl: "",
      photoUrl: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      fullName: member?.fullName ?? "",
      role: member?.role ?? "",
      bio: member?.bio ?? "",
      email: member?.email ?? "",
      linkedinUrl: member?.linkedinUrl && member.linkedinUrl !== "#" ? member.linkedinUrl : "",
      photoUrl: member?.photoUrl ?? "",
    });
    setPreview(member?.photoUrl ?? "");
  }, [open, member, form]);

  const bioValue = form.watch("bio") ?? "";
  const bioCount = useMemo(() => bioValue.length, [bioValue]);

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    form.setValue("photoUrl", url);
  }

  function onSubmit(values: TeamMemberFormValues) {
    onSave({
      fullName: values.fullName.trim(),
      role: values.role.trim(),
      bio: values.bio?.trim() || "Team member at Bharwana Estates Developer.",
      email: values.email?.trim() || undefined,
      linkedinUrl: values.linkedinUrl?.trim() || undefined,
      photoUrl: values.photoUrl?.trim() || preview || DEFAULT_AVATAR,
      about:
        member?.about?.trim() ||
        values.bio?.trim() ||
        "Team member at Bharwana Estates Developer.",
      expertise: member?.expertise ?? [],
      responsibilities: member?.responsibilities ?? [],
      highlights: member?.highlights ?? [],
      phone: member?.phone,
      location: member?.location,
      department: member?.department,
      yearsExperience: member?.yearsExperience,
      quote: member?.quote,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-ivory sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEdit ? "Edit team member" : "Add team member"}
          </DialogTitle>
          <DialogDescription>
            Changes appear on the public About page within this session.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      className={fieldState.error ? "border-destructive bg-white" : "bg-white"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Role / title</FormLabel>
                  <FormControl>
                    <Input
                      className={fieldState.error ? "border-destructive bg-white" : "bg-white"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field, fieldState }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Bio</FormLabel>
                    <span className="text-[11px] text-muted-foreground">{bioCount}/150</span>
                  </div>
                  <FormControl>
                    <Textarea
                      rows={3}
                      maxLength={150}
                      className={fieldState.error ? "border-destructive bg-white" : "bg-white"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        className={fieldState.error ? "border-destructive bg-white" : "bg-white"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://"
                        className={fieldState.error ? "border-destructive bg-white" : "bg-white"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Photo</p>
              <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-forest/20 bg-white px-4 py-8 text-center">
                <ImagePlus className="h-5 w-5 text-gold" />
                <span className="mt-2 text-sm text-forest">Choose a local photo</span>
                <span className="mt-1 text-xs text-muted-foreground">Preview only, not uploaded</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => onFiles(event.target.files)}
                />
              </label>
              {preview && (
                <div className="relative mt-3 h-28 w-28 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 bg-forest/80 p-1 text-ivory"
                    onClick={() => {
                      setPreview("");
                      form.setValue("photoUrl", "");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEdit ? "Save changes" : "Add member"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
