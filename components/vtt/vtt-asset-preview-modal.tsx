"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Radio, CloudFog, Map } from "lucide-react";

type VttAssetPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
  isDm: boolean;
  onLoad: (fullyFogged: boolean) => void;
  onPush?: () => void;
  isBusy?: boolean;
  type: "map" | "token" | "prop";
  tags?: string[];
};

export function VttAssetPreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  isDm,
  onLoad,
  onPush,
  isBusy,
  type,
  tags = [],
}: VttAssetPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden bg-[#111111] border-neutral-800 gap-0 shadow-2xl">
        <div className="flex flex-col md:flex-row min-h-[400px] max-h-[85vh]">
          {/* Left Column: Image Area */}
          <div className="w-full md:w-[60%] bg-[#0a0a0a] p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-neutral-800/50">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={imageUrl} 
                alt={title} 
                className="object-cover w-full h-full max-h-[65vh] rounded-xl border border-neutral-800/60 shadow-lg bg-[#111]"
              />
            ) : (
              <div className="w-full aspect-video rounded-xl border border-neutral-800/60 bg-[#111] flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Map className="h-12 w-12 opacity-20" />
                <span className="text-sm font-medium opacity-50">No Image Available</span>
              </div>
            )}
          </div>

          {/* Right Column: Metadata */}
          <div className="w-full md:w-[40%] flex flex-col">
            <div className="flex-1 p-6 sm:p-8 space-y-8 overflow-y-auto">
              <div className="space-y-3">
                <DialogTitle className="text-2xl sm:text-3xl font-medium tracking-tight text-white leading-tight break-words">
                  {title}
                </DialogTitle>
                <div className="text-sm font-medium">
                  <span className="text-orange-500 capitalize">{type === "map" ? "Battlemap" : type}</span>
                  <span className="text-neutral-500"> / {type === "map" ? "Scene Preview" : "Asset Preview"}</span>
                </div>
              </div>

              {tags && tags.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-neutral-300">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-3 py-1 text-xs font-medium text-neutral-400 bg-[#1a1a1a] border border-neutral-800 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            <div className="p-5 bg-[#111] border-t border-neutral-800/60 flex flex-wrap gap-3 justify-end mt-auto">
              <Button variant="outline" onClick={onClose} disabled={isBusy} className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">
                Cancel
              </Button>

              {type === "map" && (
                <>
                  {isDm && (
                    <Button 
                      variant="outline" 
                      disabled={!imageUrl || isBusy}
                      onClick={() => onLoad(true)}
                      className="gap-2 bg-[#1a1a1a] border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    >
                      <CloudFog className="h-4 w-4" />
                      Load Fogged
                    </Button>
                  )}
                  
                  <Button 
                    variant="default" 
                    disabled={!imageUrl || isBusy}
                    onClick={() => onLoad(false)}
                    className="bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 shadow-sm"
                  >
                    {isBusy ? "Loading..." : "Load to Scene"}
                  </Button>

                  {isDm && onPush && (
                    <Button 
                      variant="default" 
                      disabled={!imageUrl || isBusy}
                      onClick={onPush}
                      className="gap-2 bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 shadow-sm"
                    >
                      <Radio className="h-4 w-4" />
                      Send to Players
                    </Button>
                  )}
                </>
              )}

              {type !== "map" && (
                <Button 
                  variant="default" 
                  disabled={!imageUrl || isBusy || !isDm}
                  onClick={() => onLoad(false)}
                  className="bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 shadow-sm"
                >
                  {isBusy ? "Placing..." : "Place on Map"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
