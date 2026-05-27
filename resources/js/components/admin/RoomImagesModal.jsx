import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Trash2, Check, Star, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import * as api from '../../services/api';

export default function RoomImagesModal({ room, onClose }) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadingFiles, setUploadingFiles] = useState([]);

    // Query Invalidation Helper
    const invalidateRoomQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
        queryClient.invalidateQueries({ queryKey: ['roomsWithTimeline'] });
    };

    // Upload Mutation
    const uploadMutation = useMutation({
        mutationFn: (formData) => api.uploadRoomImages(room.id, formData),
        onSuccess: (data) => {
            invalidateRoomQueries();
            setUploadingFiles([]);
            setUploadError('');
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.message || 'Failed to upload images.';
            setUploadError(msg);
            setUploadingFiles([]);
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (imagePath) => api.deleteRoomImage(room.id, imagePath),
        onSuccess: () => {
            invalidateRoomQueries();
        },
        onError: (err) => {
            alert(err.response?.data?.message || err.message || 'Failed to delete image.');
        }
    });

    // Set Cover Image Mutation
    const setPrimaryMutation = useMutation({
        mutationFn: (imagePath) => api.setRoomPrimaryImage(room.id, imagePath),
        onSuccess: () => {
            invalidateRoomQueries();
        },
        onError: (err) => {
            alert(err.response?.data?.message || err.message || 'Failed to set cover photo.');
        }
    });

    // File Processing & Validation
    const processFiles = (files) => {
        setUploadError('');
        if (files.length === 0) return;

        const validFiles = [];
        const maxSizeBytes = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!allowedTypes.includes(file.type)) {
                setUploadError(`File "${file.name}" is not a supported image format. Please upload JPG, PNG, WEBP, or GIF.`);
                return;
            }
            if (file.size > maxSizeBytes) {
                setUploadError(`File "${file.name}" exceeds the 10MB limit.`);
                return;
            }
            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            setUploadingFiles(validFiles.map(f => f.name));
            const formData = new FormData();
            validFiles.forEach((file) => {
                formData.append('files[]', file);
            });
            uploadMutation.mutate(formData);
        }
    };

    // Drag-and-Drop Handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    // Cover Path Normalizer
    const isCover = (imgRelativePath) => {
        if (!room.image_url) return false;
        // Strip out leading slash or domain for exact matches
        const cleanCover = room.image_url.replace(/^\//, '');
        const cleanImg = imgRelativePath.replace(/^\//, '');
        return cleanCover === cleanImg;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-slide-up">
                
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-mimos-500" />
                            Manage Room Gallery
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Upload photos, set cover layouts, or manage visual assets for <span className="font-semibold text-slate-700">{room.name}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Error Alerts */}
                    {uploadError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Drag and Drop Uploader Section */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={triggerFileSelect}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                            isDragging
                                ? 'border-mimos-400 bg-mimos-50/40 scale-[0.99] shadow-inner'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                            accept="image/*"
                            className="hidden"
                        />

                        {uploadMutation.isPending ? (
                            <div className="py-2 flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-mimos-500 animate-spin" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Uploading new gallery items...</p>
                                    <p className="text-xs text-slate-500 mt-1 truncate max-w-[320px]">
                                        {uploadingFiles.join(', ')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3.5 bg-slate-100 text-slate-500 rounded-full group-hover:scale-110 group-hover:bg-mimos-50 group-hover:text-mimos-600 transition-all duration-300 shadow-sm">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Drag & Drop photos here, or <span className="text-mimos-600 hover:underline">browse files</span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        PNG, JPG, WEBP, or GIF up to 10MB per image. Multiple selection supported.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Image Grid Gallery */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                            Current Photos ({room.images?.length || 0})
                        </h4>

                        {!room.images || room.images.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 border border-slate-100 rounded-2xl bg-slate-50/50 text-slate-400">
                                <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                                <p className="text-sm font-semibold text-slate-500">No Custom Room Photos</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-[280px] text-center leading-relaxed">
                                    This room is currently using standard system placeholder slideshows. Upload photos above to replace it.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {room.images.map((img) => {
                                    const primary = isCover(img);
                                    return (
                                        <div
                                            key={img}
                                            className={`relative aspect-[16/10] rounded-2xl overflow-hidden group shadow-sm border transition-all duration-300 ${
                                                primary
                                                    ? 'border-2 border-amber-400 ring-4 ring-amber-400/10 shadow-md shadow-amber-400/5'
                                                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                                            }`}
                                        >
                                            {/* Room Image */}
                                            <img
                                                src={img}
                                                alt={room.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />

                                            {/* Primary Cover Badge */}
                                            {primary && (
                                                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] uppercase font-bold tracking-wider shadow-sm flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-white" /> Cover Photo
                                                </div>
                                            )}

                                            {/* Glassmorphic Hover Action Overlay */}
                                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                                                {!primary && (
                                                    <button
                                                        onClick={() => setPrimaryMutation.mutate(img)}
                                                        disabled={setPrimaryMutation.isPending}
                                                        className="px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 text-xs font-semibold rounded-xl shadow-md border border-slate-100 flex items-center gap-1.5 transition-all duration-200 transform scale-90 group-hover:scale-100 cursor-pointer"
                                                        title="Set as cover photo"
                                                    >
                                                        {setPrimaryMutation.isPending ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5" />
                                                        )}
                                                        Make Cover
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to permanently delete this photo?')) {
                                                            deleteMutation.mutate(img);
                                                        }
                                                    }}
                                                    disabled={deleteMutation.isPending}
                                                    className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md flex items-center justify-center transition-all duration-200 transform scale-90 group-hover:scale-100 cursor-pointer"
                                                    title="Delete photo"
                                                >
                                                    {deleteMutation.isPending ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer bar */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50 gap-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
