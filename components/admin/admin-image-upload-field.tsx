"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";

type AssetOption = {
  id: string;
  label: string;
  url: string;
};

type AdminImageUploadFieldProps = {
  label: string;
  helper?: string;
  urlName: string;
  assetIdName: string;
  initialUrl?: string | null;
  initialAssetId?: string | null;
  assets: AssetOption[];
};

export function AdminImageUploadField({
  label,
  helper,
  urlName,
  assetIdName,
  initialUrl,
  initialAssetId,
  assets
}: AdminImageUploadFieldProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl ?? "");
  const [assetUrl, setAssetUrl] = useState(initialUrl ?? "");
  const [assetId, setAssetId] = useState(initialAssetId ?? "");
  const [assetLabel, setAssetLabel] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-black/5 bg-black/5 p-4">
      <input name={urlName} type="hidden" value={assetUrl} />
      <input name={assetIdName} type="hidden" value={assetId} />

      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {helper ? <p className="mt-1 text-sm leading-6 text-slate">{helper}</p> : null}
      </div>

      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-slate">Selecionar asset existente</span>
        <select
          className="field-input"
          defaultValue={assetId}
          onChange={(event) => {
            const selected = assets.find((asset) => asset.id === event.target.value);
            setAssetId(selected?.id ?? "");
            setAssetUrl(selected?.url ?? "");
            setPreviewUrl(selected?.url ?? "");
            setFeedback(null);
          }}
        >
          <option value="">Escolha um asset já enviado</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-slate">Novo upload</span>
            <input
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="field-input"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setFeedback(null);

                if (file) {
                  setPreviewUrl(URL.createObjectURL(file));
                  setAssetLabel(file.name.replace(/\.[^.]+$/, ""));
                }
              }}
              type="file"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-slate">Label do asset</span>
            <input
              className="field-input"
              onChange={(event) => setAssetLabel(event.target.value)}
              placeholder="Banner home campanha"
              type="text"
              value={assetLabel}
            />
          </label>
        </div>

        <button
          className="button-secondary self-end justify-center"
          disabled={!selectedFile || isUploading}
          onClick={() => {
            if (!selectedFile) {
              return;
            }

            startUpload(async () => {
              const formData = new FormData();
              formData.set("image", selectedFile);
              formData.set("label", assetLabel);

              const response = await fetch("/api/admin/uploads", {
                method: "POST",
                body: formData
              });
              const result = (await response.json()) as {
                ok: boolean;
                message: string;
                assetId?: string;
                url?: string;
              };

              setFeedback(result.message);

              if (!response.ok || !result.ok || !result.url || !result.assetId) {
                return;
              }

              setAssetId(result.assetId);
              setAssetUrl(result.url);
              setPreviewUrl(result.url);
              setSelectedFile(null);
            });
          }}
          type="button"
        >
          {isUploading ? "Enviando..." : "Enviar imagem"}
        </button>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white p-3">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[1.25rem] bg-sand">
            <img alt={label} className="h-full w-full object-contain" src={previewUrl} />
          </div>
          <p className="mt-3 text-sm text-slate">{assetUrl || previewUrl}</p>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-4 text-sm text-slate">
          Nenhuma imagem vinculada.
        </div>
      )}

      {feedback ? <p className="text-sm leading-7 text-slate">{feedback}</p> : null}
    </div>
  );
}
