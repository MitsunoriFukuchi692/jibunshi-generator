import { useState } from 'react';
import { API_URL } from '../config';

interface UploadedPhoto {
  id?: number;
  filename: string;
  file: File;
  preview: string;
  description: string;
  originalSize: number;
  compressedSize: number;
}

export default function PhotoUploadPage({ 
  userId, 
  token, 
  timelineId,
  onComplete 
}: { 
  userId: number; 
  token: string | null; 
  timelineId?: number;
  onComplete: () => void 
}) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // ✅ 新: 画像圧縮関数
  const compressImage = (file: File): Promise<{ compressedFile: File; preview: string; originalSize: number; compressedSize: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Canvas で画像を圧縮
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // 最大幅 1200px、最大高さ 1200px にリサイズ
          const maxWidth = 1200;
          const maxHeight = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Canvas を Blob に変換（JPEG 品質 0.7）
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Blob creation failed'));
                return;
              }

              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              const preview = canvas.toDataURL('image/jpeg', 0.7);
              
              resolve({
                compressedFile,
                preview,
                originalSize: file.size,
                compressedSize: compressedFile.size
              });
            },
            'image/jpeg',
            0.7 // JPEG 品質 70%
          );
        };
        img.onerror = () => {
          reject(new Error('Image loading failed'));
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setCompressing(true);
    try {
      const fileArray = Array.from(files);
      
      for (const file of fileArray) {
        try {
          const { compressedFile, preview, originalSize, compressedSize } = await compressImage(file);
          
          const newPhoto: UploadedPhoto = {
            filename: file.name,
            file: compressedFile,
            preview,
            description: '',
            originalSize,
            compressedSize
          };
          
          setPhotos((prev) => [...prev, newPhoto]);
          
          console.log(`📸 画像圧縮完了: ${file.name}`);
          console.log(`   元のサイズ: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`   圧縮後: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`   圧縮率: ${(((originalSize - compressedSize) / originalSize) * 100).toFixed(1)}%`);
        } catch (error) {
          console.error(`❌ 画像圧縮エラー: ${file.name}`, error);
          alert(`${file.name} の処理に失敗しました`);
        }
      }
    } finally {
      setCompressing(false);
    }
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      alert('少なくとも1枚の写真を選択してください');
      return;
    }

    setUploading(true);
    try {
      const uploadedPhotoIds: number[] = [];

      // ステップ1: 写真をアップロード
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('userId', userId.toString());
        formData.append('timelineId', timelineId?.toString() || '');
        formData.append('description', photo.description);

        console.log('🖼️ 写真アップロード中:', photo.filename, 'サイズ:', (photo.compressedSize / 1024).toFixed(0), 'KB');

        const response = await fetch(`${API_URL}/api/photos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('写真のアップロードに失敗しました');
        }

        const uploadedPhoto = await response.json();
        uploadedPhotoIds.push(uploadedPhoto.id);
        console.log('✅ 写真アップロード完了 - id:', uploadedPhoto.id);
      }

      alert('全ての写真がアップロードされました！');
      setPhotos([]);
      onComplete();
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert('写真のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    uploadBox: {
      border: '2px dashed #3498db',
      borderRadius: '8px',
      padding: '40px',
      textAlign: 'center' as const,
      backgroundColor: '#ecf0f1',
      marginBottom: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      opacity: compressing ? 0.6 : 1,
    },
    uploadText: {
      fontSize: '16px',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    fileInput: {
      display: 'none',
    },
    button: {
      padding: '10px 20px',
      fontSize: '14px',
      borderRadius: '4px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s ease',
    },
    selectButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    photosContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    photoCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    photoImage: {
      width: '100%',
      height: '150px',
      objectFit: 'cover' as const,
    },
    photoInfo: {
      padding: '10px',
    },
    photoSizeInfo: {
      fontSize: '11px',
      color: '#7f8c8d',
      marginBottom: '5px',
      lineHeight: '1.3',
    },
    photoInput: {
      width: '100%',
      padding: '8px',
      fontSize: '14px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      marginBottom: '5px',
      boxSizing: 'border-box' as const,
    },
    removeButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '8px 12px',
      fontSize: '14px',
      width: '100%',
      minHeight: '40px',
    },
    uploadButton: {
      width: '100%',
      padding: '15px',
      backgroundColor: '#27ae60',
      color: 'white',
      fontSize: '16px',
      marginBottom: '10px',
      minHeight: '48px',
    },
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '15px',
      color: '#2c3e50',
      marginBottom: '20px',
      lineHeight: '1.6',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📷 写真UP</h1>
      </div>

      <div style={styles.info}>
        💭 思い出の写真を複数枚アップロードしてください。写真は自動で圧縮されるので、スマートフォンでも快適にアップロードできます！
      </div>

      <div
        style={styles.uploadBox}
        onClick={() => !compressing && document.getElementById('fileInput')?.click()}
      >
        <div style={styles.uploadText}>
          {compressing ? '📦 画像を処理中...' : '📸 クリックして写真を選択'}
        </div>
        <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
          {compressing ? '複数枚の場合は少しお待ちください' : 'または、ここにドラッグ＆ドロップ'}
        </div>
        <input
          id="fileInput"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={compressing}
          style={styles.fileInput}
        />
      </div>

      {photos.length > 0 && (
        <>
          <h3 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '16px' }}>
            選択した写真（{photos.length}枚）
          </h3>
          <div style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <div key={index} style={styles.photoCard}>
                <img src={photo.preview} alt={`preview-${index}`} style={styles.photoImage} />
                <div style={styles.photoInfo}>
                  <div style={styles.photoSizeInfo}>
                    <div>圧縮前: {(photo.originalSize / 1024 / 1024).toFixed(2)} MB</div>
                    <div>圧縮後: {(photo.compressedSize / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <input
                    type="text"
                    placeholder="説明を入力..."
                    value={photo.description}
                    onChange={(e) => {
                      const updated = [...photos];
                      updated[index].description = e.target.value;
                      setPhotos(updated);
                    }}
                    style={styles.photoInput}
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    style={{ ...styles.button, ...styles.removeButton }}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              ...styles.button,
              ...styles.uploadButton,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </>
      )}
    </div>
  );
}
