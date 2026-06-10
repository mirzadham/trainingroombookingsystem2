import os
import sys
import time
from PIL import Image
import pillow_heif

# Register HEIC opener with Pillow
pillow_heif.register_heif_opener()

# Configuration
SOURCE_DIR = 'roomimages'
TARGET_DIR = 'processedroomimages'
MAX_DIMENSION = 1600
QUALITY = 85

def get_readable_size(size_in_bytes):
    """Convert bytes to a human-readable string (e.g., KB, MB)."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.2f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.2f} TB"

def optimize_image(src_path, dest_path, convert_to_webp=False):
    """Resizes and compresses an image, saving it to the destination path."""
    try:
        # Load image
        img = Image.open(src_path)
        
        # Keep track of original size
        orig_w, orig_h = img.size
        
        # Calculate new dimensions keeping aspect ratio
        if orig_w > MAX_DIMENSION or orig_h > MAX_DIMENSION:
            if orig_w > orig_h:
                new_w = MAX_DIMENSION
                new_h = int((MAX_DIMENSION / orig_w) * orig_h)
            else:
                new_h = MAX_DIMENSION
                new_w = int((MAX_DIMENSION / orig_h) * orig_w)
                
            # Perform high-quality downsampling
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            resize_str = f"Resized from {orig_w}x{orig_h} to {new_w}x{new_h}"
        else:
            resize_str = f"Dimensions kept: {orig_w}x{orig_h}"
            
        # Determine format and save options
        if convert_to_webp:
            # For WebP, ensure color mode is compatible (RGB)
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                # Keep transparency if present
                pass
            else:
                img = img.convert('RGB')
            img.save(dest_path, 'WEBP', quality=QUALITY, method=6) # method=6 is highest compression effort
        else:
            # For JPEG, must convert to RGB (can't save RGBA as JPEG)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(dest_path, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
            
        return True, resize_str
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 80)
    print(" ROOM IMAGE OPTIMIZATION UTILITY ")
    print("=" * 80)
    print(f"Source Directory:      {os.path.abspath(SOURCE_DIR)}")
    print(f"Destination Directory: {os.path.abspath(TARGET_DIR)}")
    print(f"Max Dimension Limit:   {MAX_DIMENSION}px")
    print(f"Compression Quality:   {QUALITY}%")
    print("-" * 80)
    
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory '{SOURCE_DIR}' does not exist!")
        sys.exit(1)
        
    os.makedirs(TARGET_DIR, exist_ok=True)
    
    total_files = 0
    successful_files = 0
    total_original_bytes = 0
    total_processed_bytes = 0
    
    start_time = time.time()
    
    # Walk through the source directory
    for root, dirs, files in os.walk(SOURCE_DIR):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in ['.heic', '.jpg', '.jpeg']:
                continue
                
            total_files += 1
            src_file_path = os.path.join(root, file)
            
            # Recreate subdirectory structure in target directory
            rel_path = os.path.relpath(root, SOURCE_DIR)
            dest_folder = os.path.join(TARGET_DIR, rel_path) if rel_path != '.' else TARGET_DIR
            os.makedirs(dest_folder, exist_ok=True)
            
            # Determine output filename and format
            is_heic = ext == '.heic'
            if is_heic:
                dest_filename = os.path.splitext(file)[0] + '.webp'
            else:
                dest_filename = file
                
            dest_file_path = os.path.join(dest_folder, dest_filename)
            
            orig_size = os.path.getsize(src_file_path)
            total_original_bytes += orig_size
            
            print(f"Processing: {os.path.join(rel_path, file)}")
            
            success, info = optimize_image(src_file_path, dest_file_path, convert_to_webp=is_heic)
            
            if success:
                successful_files += 1
                proc_size = os.path.getsize(dest_file_path)
                total_processed_bytes += proc_size
                
                reduction = orig_size - proc_size
                reduction_pct = (reduction / orig_size) * 100 if orig_size > 0 else 0
                
                print(f"  +- SUCCESS: {info}")
                print(f"  +- Size: {get_readable_size(orig_size)} -> {get_readable_size(proc_size)} (-{reduction_pct:.1f}%)")
            else:
                print(f"  +- FAILED: {info}")
            print("-" * 80)
            
    end_time = time.time()
    elapsed = end_time - start_time
    
    # Final summary
    print("=" * 80)
    print(" OPTIMIZATION SUMMARY ")
    print("=" * 80)
    print(f"Total Files Found:      {total_files}")
    print(f"Successfully Processed: {successful_files}")
    print(f"Failed Files:           {total_files - successful_files}")
    print(f"Total Original Size:    {get_readable_size(total_original_bytes)}")
    print(f"Total Optimized Size:   {get_readable_size(total_processed_bytes)}")
    
    if total_original_bytes > 0:
        saved_bytes = total_original_bytes - total_processed_bytes
        saved_pct = (saved_bytes / total_original_bytes) * 100
        print(f"Total Space Saved:      {get_readable_size(saved_bytes)} ({saved_pct:.1f}% reduction)")
        
    print(f"Time Elapsed:           {elapsed:.2f} seconds")
    print("=" * 80)

if __name__ == '__main__':
    main()
