"use client";

import { useMemo, useState } from "react";
import type { CategoryResponse } from "@/lib/types";
import { PUBLIC_API_BASE } from "@/lib/api";
import { Loader2, Sparkles, X } from "lucide-react";
import { SketchPicker, ColorResult } from "react-color";
import EmojiPicker, {
  EmojiClickData,
  Theme,
  EmojiStyle,
} from "emoji-picker-react";

const COLOR_PALETTE = [
  "#10B981",
  "#22D3EE",
  "#F97316",
  "#F472B6",
  "#A855F7",
  "#FACC15",
  "#38BDF8",
  "#94A3B8",
  "#F43F5E",
  "#0EA5E9",
];

const ICON_SUGGESTIONS = [
  "💼",
  "🍔",
  "🏠",
  "🎉",
  "🛒",
  "🚗",
  "💡",
  "💊",
  "🎁",
  "✈️",
  "📚",
  "🐾",
  "🧖",
  "🎮",
  "📱",
  "🧾",
];

type BaseDialogProps = {
  onClose: () => void;
  onSuccess: (category: CategoryResponse) => void;
  onError: (message: string) => void;
};

type AddDialogProps = BaseDialogProps & {
  open: boolean;
};

type EditDialogProps = BaseDialogProps & {
  open: boolean;
  category: CategoryResponse | null;
};

type DeleteDialogProps = {
  open: boolean;
  category: CategoryResponse | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
};

export function AddCategoryDialog({
  open,
  onClose,
  onSuccess,
  onError,
}: AddDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState("💼");
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const reset = () => {
    setName("");
    setColor(COLOR_PALETTE[0]);
    setIcon("💼");
    setLoading(false);
    setAiLoading(false);
    setAiPrompt("");
  };

  const close = () => {
    if (loading || aiLoading) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!name.trim()) {
      onError("Completează denumirea categoriei.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${PUBLIC_API_BASE}/api/v1/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          color,
          icon,
        }),
      });

      const detail = (await response.json()) as CategoryResponse;
      if (!response.ok) {
        throw new Error(
          (detail as unknown as { detail?: string })?.detail ||
            "Nu am putut crea categoria."
        );
      }

      onSuccess(detail);
      reset();
      onClose();
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "A apărut o eroare la crearea categoriei."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <DialogShell
      title="Adaugă categorie"
      description="Definește o nouă categorie personalizată."
      onClose={close}
    >
      <AiAssistSection
        prompt={aiPrompt}
        loading={aiLoading}
        onPromptChange={setAiPrompt}
        onSuggest={async () => {
          if (aiPrompt.trim().length < 4) {
            onError("Descrie categoria în câteva cuvinte înainte de a folosi AI.");
            return;
          }
          setAiLoading(true);
          try {
            const response = await fetch(`${PUBLIC_API_BASE}/api/v1/categories/suggest`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ description: aiPrompt }),
            });

            const detail = await response.json();
            if (!response.ok) {
              throw new Error(detail?.detail || "Nu am putut genera sugestia.");
            }

            setName(detail.name);
            setColor(detail.color);
            setIcon(detail.icon);
          } catch (err) {
            onError(
              err instanceof Error
                ? err.message
                : "AI nu a reușit să genereze sugestia."
            );
          } finally {
            setAiLoading(false);
          }
        }}
      />

      <CategoryForm
        name={name}
        color={color}
        icon={icon}
        onNameChange={setName}
        onColorChange={setColor}
        onIconChange={setIcon}
        allowColor
        allowIcon
      />
      <DialogActions
        loading={loading}
        cancelLabel="Renunță"
        confirmLabel="Adaugă"
        onCancel={close}
        onConfirm={submit}
      />
    </DialogShell>
  );
}

export function EditCategoryDialog({
  open,
  category,
  onClose,
  onSuccess,
  onError,
}: EditDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? COLOR_PALETTE[0]);
  const [icon, setIcon] = useState(category?.icon ?? "💼");
  const [loading, setLoading] = useState(false);

  const isDefault = category?.is_default;

  useMemo(() => {
    if (category) {
      setName(category.name);
      setColor(category.color || COLOR_PALETTE[0]);
      setIcon(category.icon || "💼");
    }
  }, [category]);

  const close = () => {
    if (loading) return;
    onClose();
  };

  const submit = async () => {
    if (!category) return;
    if (!name.trim()) {
      onError("Completează denumirea.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { name: name.trim() };
      if (!isDefault) {
        payload.color = color;
      }
      payload.icon = icon;

      const response = await fetch(
        `${PUBLIC_API_BASE}/api/v1/categories/${category.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const detail = (await response.json()) as CategoryResponse;
      if (!response.ok) {
        throw new Error(
          (detail as unknown as { detail?: string })?.detail ||
            "Nu am putut actualiza categoria."
        );
      }

      onSuccess(detail);
      onClose();
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "A apărut o eroare la actualizare."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open || !category) return null;

  return (
    <DialogShell
      title="Editează categorie"
      description={
        isDefault
          ? "Categoria este implicită. Poți modifica doar denumirea și iconița."
          : "Actualizează detaliile categoriei."
      }
      onClose={close}
    >
      <CategoryForm
        name={name}
        color={color}
        icon={icon}
        onNameChange={setName}
        onColorChange={setColor}
        onIconChange={setIcon}
        allowColor={!isDefault}
        allowIcon
      />
      <DialogActions
        loading={loading}
        cancelLabel="Renunță"
        confirmLabel="Salvează"
        onCancel={close}
        onConfirm={submit}
      />
    </DialogShell>
  );
}

export function DeleteCategoryDialog({
  open,
  category,
  onClose,
  onDeleted,
  onError,
}: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  if (!open || !category) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${PUBLIC_API_BASE}/api/v1/categories/${category.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(
          detail?.detail || "Nu am putut șterge categoria."
        );
      }
      onDeleted(category.id);
      onClose();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "A apărut o eroare la ștergere."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogShell
      title="Șterge categorie"
      description="Tranzacțiile care aparțin acestei categorii vor fi mutate în 'Fără categorie'."
      onClose={() => {
        if (!loading) onClose();
      }}
    >
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-white/80">
        <p className="font-semibold text-white">{category.name}</p>
        <p>Culoare: {category.color || "implicit"}</p>
        <p>Icon: {category.icon || "—"}</p>
      </div>
      <DialogActions
        loading={loading}
        cancelLabel="Renunță"
        confirmLabel="Șterge"
        confirmTone="danger"
        onCancel={onClose}
        onConfirm={handleDelete}
      />
    </DialogShell>
  );
}

type CategoryFormProps = {
  name: string;
  color: string;
  icon: string;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onIconChange: (value: string) => void;
  allowColor: boolean;
  allowIcon: boolean;
};

function CategoryForm({
  name,
  color,
  icon,
  onNameChange,
  onColorChange,
  onIconChange,
  allowColor,
  allowIcon,
}: CategoryFormProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleColorChange = (value: ColorResult) => {
    onColorChange(value.hex);
  };

  const handleEmojiClick = (emoji: EmojiClickData) => {
    onIconChange(emoji.emoji);
    setEmojiPickerOpen(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-white/50">
          Denumire
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Groceries"
        />
      </div>

      <div className="relative">
        <label className="text-xs uppercase tracking-[0.3em] text-white/50">
          Culoare
        </label>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
          <span
            className="h-10 w-10 rounded-2xl border border-white/10"
            style={{ backgroundColor: color }}
          />
          <button
            type="button"
            className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-white hover:border-white/40 disabled:opacity-40"
            onClick={() => allowColor && setColorPickerOpen((prev) => !prev)}
            disabled={!allowColor}
          >
            Selectează culoare
          </button>
          <input
            className="flex-1 rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            disabled={!allowColor}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {COLOR_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`h-8 w-8 rounded-full border-2 ${
                color === hex ? "border-white" : "border-transparent"
              } ${!allowColor ? "opacity-40 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: hex }}
              onClick={() => allowColor && onColorChange(hex)}
              disabled={!allowColor}
            />
          ))}
        </div>
        {colorPickerOpen && allowColor && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setColorPickerOpen(false)}
            />
            <div className="absolute left-0 top-full z-50 mt-3 rounded-2xl border border-white/10 bg-slate-900/90 p-3">
              <SketchPicker color={color} onChange={handleColorChange} disableAlpha />
            </div>
          </>
        )}
      </div>

      {allowIcon && (
        <div className="relative">
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
            Icon
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {ICON_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`h-10 w-10 rounded-2xl border border-white/10 text-xl ${
                  icon === suggestion ? "bg-white/10" : "bg-transparent"
                }`}
                onClick={() => onIconChange(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <input
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
            value={icon}
            onChange={(e) => onIconChange(e.target.value)}
          />
          <button
            type="button"
            className="mt-3 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
            onClick={() => setEmojiPickerOpen((prev) => !prev)}
          >
            Alege din emoji picker
          </button>
          {emojiPickerOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setEmojiPickerOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-3 rounded-2xl border border-white/10 bg-slate-900/90 p-3">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  emojiStyle={EmojiStyle.NATIVE}
                  theme={Theme.DARK}
                  lazyLoadEmojis
                  searchDisabled={false}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type DialogShellProps = {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
};

function DialogShell({ title, description, onClose, children }: DialogShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              {title}
            </p>
            <p className="text-sm text-white/70">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white hover:border-white/40"
            title="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type DialogActionsProps = {
  loading: boolean;
  cancelLabel: string;
  confirmLabel: string;
  confirmTone?: "default" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
};

function DialogActions({
  loading,
  cancelLabel,
  confirmLabel,
  confirmTone = "default",
  onCancel,
  onConfirm,
}: DialogActionsProps) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        onClick={onCancel}
        className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
        disabled={loading}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
          confirmTone === "danger"
            ? "bg-rose-500 text-white hover:bg-rose-400"
            : "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
        } disabled:opacity-60`}
        disabled={loading}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Se procesează...
          </span>
        ) : (
          confirmLabel
        )}
      </button>
    </div>
  );
}
type AiAssistSectionProps = {
  prompt: string;
  loading: boolean;
  onPromptChange: (value: string) => void;
  onSuggest: () => void;
};

function AiAssistSection({
  prompt,
  loading,
  onPromptChange,
  onSuggest,
}: AiAssistSectionProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/70">
        <Sparkles className="h-4 w-4 text-emerald-300" />
        <span>Adaugă cu AI (opțional)</span>
      </div>
      <textarea
        className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-300/60 focus:outline-none"
        placeholder="Ex: Cheltuieli pentru animale, hrană și veterinar"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        disabled={loading}
      />
      <button
        onClick={onSuggest}
        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
        disabled={loading}
        type="button"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            AI generează...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-emerald-300" />
            Sugerează cu AI
          </>
        )}
      </button>
    </div>
  );
}
