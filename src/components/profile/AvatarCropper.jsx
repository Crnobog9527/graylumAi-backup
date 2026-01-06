import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

// 创建裁剪后的图片
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
};

export default function AvatarCropper({ open, onOpenChange, imageSrc, onCropComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      await onCropComplete(file);
      onOpenChange(false);
    } catch (error) {
      console.error('Crop failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>裁剪头像</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[300px] rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
            />
          )}
        </div>

        <div className="flex items-center gap-4 py-2">
          <ZoomOut className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(value) => setZoom(value[0])}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            style={{
              background: 'transparent',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)'
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'var(--bg-primary)'
            }}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '确认'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}