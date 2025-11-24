import { useState } from 'react';

interface UploadedPhoto {
  id?: number;
  filename: string;
  file: File;
  preview: string;
  description: string;
}

export default function PhotoUploadPage({ userId, onComplete }: { userId: number; onComplete: () => void }) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto: UploadedPhoto = {
          filename: file.name,
          file,
          preview: event.target?.result as string,
          description: '',
        };
        setPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      alert('少なくとも1枚の写真を選択してください');
      return;
    }

    setUploading(true);
    try {
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('userId', userId.toString());
        formData.append('description', photo.description);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('写真のアップロードに失敗しました');
        }
      }

      alert('全ての写真がアップロードされました！');
      setPhotos([]);
      onComplete(); // 親コンポーネントの次のステップに進む
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
    photoInput: {
      width: '100%',
      padding: '5px',
      fontSize: '12px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      marginBottom: '5px',
      boxSizing: 'border-box' as const,
    },
    removeButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '5px 10px',
      fontSize: '12px',
      width: '100%',
    },
    uploadButton: {
      width: '100%',
      padding: '15px',
      backgroundColor: '#27ae60',
      color: 'white',
      fontSize: '16px',
      marginBottom: '10px',
    },
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#2c3e50',
      marginBottom: '20px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📸 思い出の写真をアップロード</h1>
      </div>

      <div style={styles.info}>
        👤 思い出の写真を複数枚アップロードしてください。AI があなたの人生を分析します。
      </div>

      <div
        style={styles.uploadBox}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <div style={styles.uploadText}>📷 クリックして写真を選択</div>
        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>または、ここにドラッグ＆ドロップ</div>
        <input
          id="fileInput"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          style={styles.fileInput}
        />
      </div>

      {photos.length > 0 && (
        <>
          <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>
            選択した写真（{photos.length}枚）
          </h3>
          <div style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <div key={index} style={styles.photoCard}>
                <img src={photo.preview} alt={`preview-${index}`} style={styles.photoImage} />
                <div style={styles.photoInfo}>
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
