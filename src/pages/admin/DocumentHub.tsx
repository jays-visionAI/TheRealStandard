import { useState, useMemo } from 'react'
import {
    BookOpenIcon,
    PlusIcon,
    SearchIcon,
    FileTextIcon,
    ExternalLinkIcon,
    YoutubeIcon,
    TrashIcon,
    EditIcon,
    XIcon,
    ArrowLeftIcon,
    PaperclipIcon,
    SendIcon,
    LockIcon,
    UserIcon,
    MessageSquareIcon,
    KakaoIcon
} from '../../components/Icons'
import { shareDocument } from '../../lib/kakaoService'
import { useDocStore, TRS_Document } from '../../stores/docStore'
import { useAuth } from '../../contexts/AuthContext'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import './DocumentHub.css'

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
    ],
}

const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '')
}

export default function DocumentHub() {
    const { user } = useAuth()
    const {
        categories, documents, addCategory, deleteCategory,
        addDocument, updateDocument, deleteDocument,
        addComment, deleteComment, addAttachment, deleteAttachment
    } = useDocStore()

    const [activeTab, setActiveTab] = useState('cat-all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showEditor, setShowEditor] = useState(false)
    const [editingDoc, setEditingDoc] = useState<TRS_Document | null>(null)
    const [viewingDoc, setViewingDoc] = useState<TRS_Document | null>(null)
    const [newComment, setNewComment] = useState('')

    const [formData, setFormData] = useState<Partial<TRS_Document>>({
        title: '',
        content: '',
        type: 'MARKDOWN',
        categoryId: 'cat-all',
        url: '',
        attachments: []
    })

    // Filter categories based on user role
    const visibleCategories = useMemo(() => {
        return categories.filter(cat => {
            if (!cat.allowedRoles) return true
            return cat.allowedRoles.includes(user?.role as any)
        })
    }, [categories, user])

    // Filter documents based on visibility permissions and tab
    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            const category = categories.find(c => c.id === doc.categoryId)
            const hasPermission = !category?.allowedRoles || category.allowedRoles.includes(user?.role as any)
            if (!hasPermission) return false

            const matchesTab = activeTab === 'cat-all' || doc.categoryId === activeTab
            const title = doc.title || ''
            const content = doc.content || ''
            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                content.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesTab && matchesSearch
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }, [documents, activeTab, searchQuery, user, categories])

    const handleAddCategory = () => {
        const name = prompt('새 카테고리명을 입력하세요:')
        if (name) {
            const isAdminOnly = window.confirm('관리자 전용 카테고리로 설정할까요?')
            addCategory(name, isAdminOnly ? ['ADMIN'] : undefined)
        }
    }

    const handleOpenCreate = () => {
        setEditingDoc(null)
        setFormData({
            title: '',
            content: '',
            type: 'MARKDOWN',
            categoryId: activeTab === 'cat-all' ? 'cat-manual' : activeTab,
            url: '',
            attachments: []
        })
        setShowEditor(true)
    }

    const handleEdit = (doc: TRS_Document) => {
        setEditingDoc(doc)
        setFormData({ ...doc })
        setShowEditor(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingDoc) {
            updateDocument(editingDoc.id, formData)
        } else {
            addDocument({
                title: formData.title || '제목 없음',
                content: formData.content || '',
                type: formData.type || 'MARKDOWN',
                categoryId: formData.categoryId || 'cat-all',
                url: formData.url,
                author: user?.name || '익명',
                authorId: user?.id || 'anon',
                attachments: formData.attachments || []
            })
        }
        setShowEditor(false)
    }

    const handleEditorFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return
        const file = e.target.files[0]
        const newAttachment = {
            id: `att-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file)
        }
        setFormData(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), newAttachment]
        }))
    }

    const removeEditorAttachment = (id: string) => {
        setFormData(prev => ({
            ...prev,
            attachments: (prev.attachments || []).filter(a => a.id !== id)
        }))
    }

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault()
        if (!viewingDoc || !newComment.trim()) return
        addComment(viewingDoc.id, user?.name || '익명', user?.id || 'anon', newComment)
        setNewComment('')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !viewingDoc) return
        const file = e.target.files[0]
        // Mock add attachment
        addAttachment(viewingDoc.id, {
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file) // temporary local url
        })
    }

    const getEmbedUrl = (url: string, type: string) => {
        if (!url) return ''
        if (type === 'YOUTUBE') {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
            const match = url.match(regExp)
            return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url
        }
        return url
    }

    return (
        <div className="document-hub">
            <div className="page-header">
                <div className="header-left">
                    <h1><BookOpenIcon size={24} /> Document Hub</h1>
                    <p className="text-secondary">사내 지식 및 교육 자료를 관리하며 의견을 나눕니다</p>
                </div>
                {user?.role === 'ADMIN' && (
                    <button className="btn btn-primary" onClick={handleOpenCreate}>
                        <PlusIcon size={18} /> 새 문서 작성
                    </button>
                )}
            </div>

            {/* Category Tabs */}
            <div className="tabs-container glass-card">
                <div className="tabs">
                    {visibleCategories.map(cat => (
                        <div key={cat.id} className="tab-wrapper">
                            <button
                                className={`tab-item ${activeTab === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(cat.id)}
                            >
                                {cat.allowedRoles?.includes('ADMIN') && <LockIcon size={12} className="mr-1" />}
                                {cat.name}
                            </button>
                            {cat.id !== 'cat-all' && user?.role === 'ADMIN' && (
                                <button className="cat-delete" onClick={() => deleteCategory(cat.id)}>✕</button>
                            )}
                        </div>
                    ))}
                    {user?.role === 'ADMIN' && <button className="add-cat-btn" onClick={handleAddCategory}>+</button>}
                </div>
                <div className="search-bar">
                    <SearchIcon size={18} />
                    <input
                        type="text"
                        placeholder="문서 제목 또는 내용 검색..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Document List */}
            <div className="document-list">
                {filteredDocuments.length > 0 ? (
                    <div className="doc-grid">
                        {filteredDocuments.map(doc => (
                            <div key={doc.id} className="doc-card glass-card" onClick={() => setViewingDoc(doc)}>
                                <div className="doc-tags">
                                    {categories.find(c => c.id === doc.categoryId)?.allowedRoles?.includes('ADMIN') && (
                                        <span className="badge badge-error text-xs"><LockIcon size={10} /> 비공개</span>
                                    )}
                                </div>
                                <div className="doc-icon">
                                    {doc.type === 'YOUTUBE' ? <YoutubeIcon size={32} className="text-error" /> :
                                        doc.type === 'EMBED' ? <ExternalLinkIcon size={32} className="text-primary" /> :
                                            <FileTextIcon size={32} className="text-secondary" />}
                                </div>
                                <div className="doc-info">
                                    <h3 className="doc-title">{doc.title}</h3>
                                    <p className="doc-excerpt">{stripHtml(doc.content || '').substring(0, 100)}...</p>
                                    <div className="doc-meta">
                                        <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                                        <span className="dot"></span>
                                        <span>{doc.comments?.length || 0} 댓글</span>
                                    </div>
                                </div>
                                {user?.role === 'ADMIN' && (
                                    <div className="doc-actions" onClick={e => e.stopPropagation()}>
                                        <button className="icon-btn" onClick={() => handleEdit(doc)}><EditIcon size={16} /></button>
                                        <button className="icon-btn danger" onClick={() => deleteDocument(doc.id)}><TrashIcon size={16} /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state glass-card">
                        <BookOpenIcon size={48} className="text-muted" />
                        <p>조회 가능한 문서가 없습니다. 새로운 지식을 공유해 보세요!</p>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div className="modal-overlay" onClick={() => setShowEditor(false)}>
                    <div className="modal-content glass-card editor-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDoc ? '문서 수정' : '새 문서 작성'}</h2>
                            <button className="close-btn" onClick={() => setShowEditor(false)}><XIcon size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-row editor-top-row">
                                <div className="form-group flex-2">
                                    <label>제목</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="문서 제목을 입력하세요"
                                    />
                                </div>
                                <div className="form-group flex-1">
                                    <label>카테고리</label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group flex-1">
                                    <label>문서 타입</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="MARKDOWN">텍스트/매뉴얼</option>
                                        <option value="EMBED">웹 임베딩 (Google Docs 등)</option>
                                        <option value="YOUTUBE">유튜브 영상</option>
                                    </select>
                                </div>
                            </div>

                            {(formData.type === 'EMBED' || formData.type === 'YOUTUBE') && (
                                <div className="form-group">
                                    <label>{formData.type === 'YOUTUBE' ? '유튜브 URL' : '임베딩 URL'}</label>
                                    <input
                                        type="url"
                                        required
                                        value={formData.url || ''}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                    <p className="help-text">
                                        {formData.type === 'EMBED' ? '공개된 웹 URL을 사용하세요.' : '유튜브 영상 주소를 복사해 붙여넣으세요.'}
                                    </p>
                                </div>
                            )}

                            <div className="form-group mb-6">
                                <label className="label">내용</label>
                                <div className="quill-editor-container">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.content}
                                        onChange={content => setFormData({ ...formData, content })}
                                        modules={quillModules}
                                        placeholder="문서 내용을 입력하세요 (HTML 서식, 링크, 이미지 삽입 가능)"
                                    />
                                </div>
                            </div>

                            <div className="form-group attachment-editor-section">
                                <label className="label flex items-center justify-between">
                                    <span><PaperclipIcon size={16} className="inline mr-1" /> 첨부 파일 ({formData.attachments?.length || 0})</span>
                                    <label className="btn btn-xs btn-ghost cursor-pointer">
                                        + 파일 추가
                                        <input type="file" hidden onChange={handleEditorFileUpload} />
                                    </label>
                                </label>
                                <div className="attachment-list-editor mt-2">
                                    {formData.attachments?.map(att => (
                                        <div key={att.id} className="attachment-item-small glass-card">
                                            <span className="att-name truncate">{att.name}</span>
                                            <button
                                                type="button"
                                                className="text-error ml-2"
                                                onClick={() => removeEditorAttachment(att.id)}
                                            >✕</button>
                                        </div>
                                    ))}
                                    {formData.attachments?.length === 0 && (
                                        <div className="text-muted text-xs p-2 text-center border border-dashed border-gray-200 rounded-lg">
                                            첨부된 파일이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowEditor(false)}>취소</button>
                                <button type="submit" className="btn btn-primary">저장하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Viewer Perspective with Comments and Attachments */}
            {viewingDoc && (
                <div className="viewer-overlay">
                    <div className="viewer-layout glass-card scale-in">
                        <div className="viewer-main">
                            <div className="viewer-header">
                                <button className="back-btn" onClick={() => setViewingDoc(null)}>
                                    <ArrowLeftIcon size={20} /> 목록으로
                                </button>
                                <div className="viewer-actions">
                                    <button
                                        className="btn btn-kakao btn-sm"
                                        onClick={() => shareDocument(viewingDoc.title, stripHtml(viewingDoc.content || '').substring(0, 50), viewingDoc.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}
                                    >
                                        <KakaoIcon size={16} /> 카카오톡 공유
                                    </button>
                                    {user?.role === 'ADMIN' && (
                                        <>
                                            <button className="icon-btn" onClick={() => { handleEdit(viewingDoc); setViewingDoc(null); }}><EditIcon size={18} /></button>
                                            <button className="icon-btn danger" onClick={() => { deleteDocument(viewingDoc.id); setViewingDoc(null); }}><TrashIcon size={18} /></button>
                                        </>
                                    )}
                                    <button className="icon-btn" onClick={() => setViewingDoc(null)}><XIcon size={20} /></button>
                                </div>
                            </div>
                            <div className="viewer-content">
                                <div className="doc-header-top mb-8">
                                    <span className="badge badge-primary mb-2">
                                        {categories.find(c => c.id === viewingDoc.categoryId)?.name}
                                    </span>
                                    <h1 className="doc-title-large">{viewingDoc.title}</h1>
                                    <div className="doc-meta-large">
                                        <span className="author"><UserIcon size={14} /> {viewingDoc.author || '관리자'}</span>
                                        <span className="dot"></span>
                                        <span className="date">업데이트: {new Date(viewingDoc.updatedAt).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div
                                    className="text-content"
                                    dangerouslySetInnerHTML={{ __html: viewingDoc.content || '' }}
                                />
                                {viewingDoc.type !== 'MARKDOWN' && viewingDoc.url && (
                                    <div className="embed-container">
                                        <iframe
                                            src={getEmbedUrl(viewingDoc.url, viewingDoc.type)}
                                            frameBorder="0"
                                            allowFullScreen
                                            title={viewingDoc.title}
                                        ></iframe>
                                    </div>
                                )}

                                {/* Attachments Section */}
                                <div className="viewer-section attachments-section">
                                    <h3><PaperclipIcon size={18} /> 첨부 파일 ({viewingDoc.attachments?.length || 0})</h3>
                                    <div className="attachment-list">
                                        {viewingDoc.attachments?.map(att => (
                                            <div key={att.id} className="attachment-item">
                                                <div className="att-info">
                                                    <span className="att-name">{att.name}</span>
                                                    <span className="att-size">({(att.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <div className="att-actions">
                                                    <a href={att.url} download={att.name} className="btn btn-xs btn-ghost">다운로드</a>
                                                    {user?.role === 'ADMIN' && <button className="text-error" onClick={() => deleteAttachment(viewingDoc.id, att.id)}>✕</button>}
                                                </div>
                                            </div>
                                        ))}
                                        <label className="add-att-manual">
                                            <PlusIcon size={14} /> 파일 추가
                                            <input type="file" hidden onChange={handleFileUpload} />
                                        </label>
                                    </div>
                                </div>

                                {/* Comments Section (Moved Inside Content for Bottom Placement) */}
                                <div className="viewer-section comments-bottom-section">
                                    <div className="side-header">
                                        <h3><MessageSquareIcon size={18} /> 댓글 ({viewingDoc.comments?.length || 0})</h3>
                                    </div>
                                    <div className="comment-list">
                                        {viewingDoc.comments?.map(cmt => (
                                            <div key={cmt.id} className="comment-item">
                                                <div className="cmt-header">
                                                    <span className="cmt-author">{cmt.author}</span>
                                                    <span className="cmt-date">{new Date(cmt.createdAt).toLocaleDateString()}</span>
                                                    {(user?.id === cmt.authorId || user?.role === 'ADMIN') && (
                                                        <button className="cmt-del" onClick={() => deleteComment(viewingDoc.id, cmt.id)}>✕</button>
                                                    )}
                                                </div>
                                                <div className="cmt-text">{cmt.text}</div>
                                            </div>
                                        ))}
                                        {viewingDoc.comments?.length === 0 && (
                                            <div className="empty-comments">첫 번째 댓글을 남겨보세요!</div>
                                        )}
                                    </div>
                                    <form className="comment-form" onSubmit={handleAddComment}>
                                        <input
                                            type="text"
                                            placeholder="의견을 남겨주세요..."
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                        />
                                        <button type="submit" disabled={!newComment.trim()}><SendIcon size={18} /></button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
