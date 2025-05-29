import { Injectable } from '@angular/core'

export interface FileTypeInfo {
    is_text: boolean
    is_viewable: boolean
    category: 'text' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'binary'
    mime_type?: string
    editor_language?: string
    icon: string
}

@Injectable({
    providedIn: 'root'
})
export class FileTypeService {

    private readonly text_extensions = new Set([
        // Programming languages
        'js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
        'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj', 'hs',
        'ml', 'fs', 'elm', 'dart', 'lua', 'pl', 'r', 'jl', 'nim', 'zig',

        // Web technologies
        'html', 'htm', 'css', 'scss', 'sass', 'less', 'xml', 'xhtml', 'svg',
        'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',

        // Documentation
        'md', 'markdown', 'txt', 'rst', 'adoc', 'tex', 'rtf',

        // Shell and scripts
        'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',

        // Configuration files
        'gitignore', 'gitattributes', 'editorconfig', 'eslintrc', 'prettierrc',
        'dockerignore', 'env', 'properties', 'lock',

        // Data formats
        'csv', 'tsv', 'log', 'sql', 'graphql', 'gql'
    ])

    private readonly image_extensions = new Set([
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'
    ])

    private readonly video_extensions = new Set([
        'mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v'
    ])

    private readonly audio_extensions = new Set([
        'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'
    ])

    private readonly document_extensions = new Set([
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'
    ])

    private readonly archive_extensions = new Set([
        'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'lz', 'lzma'
    ])

    private readonly language_map: Record<string, string> = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'h': 'c',
        'hpp': 'cpp',
        'cs': 'csharp',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'clj': 'clojure',
        'hs': 'haskell',
        'ml': 'ocaml',
        'fs': 'fsharp',
        'elm': 'elm',
        'dart': 'dart',
        'lua': 'lua',
        'pl': 'perl',
        'r': 'r',
        'jl': 'julia',
        'html': 'html',
        'htm': 'html',
        'xml': 'xml',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'less': 'less',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'toml': 'toml',
        'ini': 'ini',
        'cfg': 'ini',
        'conf': 'ini',
        'md': 'markdown',
        'markdown': 'markdown',
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        'fish': 'shell',
        'ps1': 'powershell',
        'bat': 'bat',
        'cmd': 'bat',
        'sql': 'sql',
        'graphql': 'graphql',
        'gql': 'graphql',
        'dockerfile': 'dockerfile',
        'vue': 'vue'
    }

    private readonly icon_map: Record<string, string> = {
        // Programming languages
        'js': 'code_blocks',
        'jsx': 'code_blocks',
        'ts': 'code_blocks',
        'tsx': 'code_blocks',
        'py': 'code_blocks',
        'java': 'code_blocks',
        'c': 'code_blocks',
        'cpp': 'code_blocks',
        'h': 'code_blocks',
        'hpp': 'code_blocks',
        'cs': 'code_blocks',
        'php': 'code_blocks',
        'rb': 'code_blocks',
        'go': 'code_blocks',
        'rs': 'code_blocks',
        'swift': 'code_blocks',
        'kt': 'code_blocks',
        'scala': 'code_blocks',

        // Web technologies
        'html': 'code_blocks',
        'htm': 'code_blocks',
        'css': 'code_blocks',
        'scss': 'code_blocks',
        'sass': 'code_blocks',
        'less': 'code_blocks',
        'xml': 'code_blocks',
        'json': 'data_object',
        'yaml': 'settings',
        'yml': 'settings',
        'toml': 'settings',
        'ini': 'settings',
        'cfg': 'settings',
        'conf': 'settings',

        // Documentation
        'md': 'description',
        'markdown': 'description',
        'txt': 'description',
        'rst': 'description',
        'adoc': 'description',
        'tex': 'description',
        'rtf': 'description',

        // Shell and scripts
        'sh': 'terminal',
        'bash': 'terminal',
        'zsh': 'terminal',
        'fish': 'terminal',
        'ps1': 'terminal',
        'bat': 'terminal',
        'cmd': 'terminal',

        // Data formats
        'csv': 'table_chart',
        'tsv': 'table_chart',
        'log': 'article',
        'sql': 'database',
        'graphql': 'api',
        'gql': 'api',

        // Images
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'webp': 'image',
        'svg': 'image',
        'bmp': 'image',
        'ico': 'image',
        'tiff': 'image',
        'tif': 'image',

        // Videos
        'mp4': 'videocam',
        'webm': 'videocam',
        'ogg': 'videocam',
        'avi': 'videocam',
        'mov': 'videocam',
        'wmv': 'videocam',
        'flv': 'videocam',
        'mkv': 'videocam',
        'm4v': 'videocam',

        // Audio
        'mp3': 'music_note',
        'wav': 'music_note',
        'aac': 'music_note',
        'flac': 'music_note',
        'm4a': 'music_note',
        'wma': 'music_note',

        // Documents
        'pdf': 'picture_as_pdf',
        'doc': 'description',
        'docx': 'description',
        'xls': 'table',
        'xlsx': 'table',
        'ppt': 'slideshow',
        'pptx': 'slideshow',
        'odt': 'description',
        'ods': 'table',
        'odp': 'slideshow',

        // Archives
        'zip': 'folder_zip',
        'rar': 'folder_zip',
        '7z': 'folder_zip',
        'tar': 'folder_zip',
        'gz': 'folder_zip',
        'bz2': 'folder_zip',
        'xz': 'folder_zip',
        'lz': 'folder_zip',
        'lzma': 'folder_zip'
    }

    get_info(filename: string): FileTypeInfo {
        const extension = this.extract_extension(filename)
        const icon = this.icon_map[extension] || 'description'

        if (this.text_extensions.has(extension)) {
            return {
                is_text: true,
                is_viewable: true,
                category: 'text',
                editor_language: this.language_map[extension] || 'plaintext',
                icon
            }
        }

        if (this.image_extensions.has(extension)) {
            return {
                is_text: false,
                is_viewable: true,
                category: 'image',
                mime_type: this.get_image_mime_type(extension),
                icon
            }
        }

        if (this.video_extensions.has(extension)) {
            return {
                is_text: false,
                is_viewable: true,
                category: 'video',
                mime_type: this.get_video_mime_type(extension),
                icon
            }
        }

        if (this.audio_extensions.has(extension)) {
            return {
                is_text: false,
                is_viewable: true,
                category: 'audio',
                mime_type: this.get_audio_mime_type(extension),
                icon
            }
        }

        if (this.document_extensions.has(extension)) {
            return {
                is_text: false,
                is_viewable: false,
                category: 'document',
                icon
            }
        }

        if (this.archive_extensions.has(extension)) {
            return {
                is_text: false,
                is_viewable: false,
                category: 'archive',
                icon
            }
        }

        // Default to binary
        return {
            is_text: false,
            is_viewable: false,
            category: 'binary',
            icon: 'description'
        }
    }

    private extract_extension(filename: string): string {
        const parts = filename.toLowerCase().split('.')
        if (parts.length < 2) return ''

        // Handle special cases like .gitignore, .editorconfig
        if (filename.startsWith('.') && parts.length === 2) {
            return parts[1]
        }

        return parts[parts.length - 1]
    }

    private get_image_mime_type(extension: string): string {
        const mime_map: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'ico': 'image/x-icon',
            'tiff': 'image/tiff',
            'tif': 'image/tiff'
        }
        return mime_map[extension] || 'image/octet-stream'
    }

    private get_video_mime_type(extension: string): string {
        const mime_map: Record<string, string> = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'mkv': 'video/x-matroska',
            'm4v': 'video/x-m4v'
        }
        return mime_map[extension] || 'video/octet-stream'
    }

    private get_audio_mime_type(extension: string): string {
        const mime_map: Record<string, string> = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'aac': 'audio/aac',
            'flac': 'audio/flac',
            'm4a': 'audio/mp4',
            'wma': 'audio/x-ms-wma'
        }
        return mime_map[extension] || 'audio/octet-stream'
    }
}
