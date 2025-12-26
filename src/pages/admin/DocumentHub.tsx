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
    ArrowLeftIcon
} from '../../components/Icons'
import { useDocStore, TRS_Document } from '../../stores/docStore'
import './DocumentHub.css'

export default function DocumentHub() {
    const { categories, documents, addCategory, deleteCategory, addDocument, updateDocument, deleteDocument } = useDocStore()

    const [activeTab, setActiveTab] = useState('cat-all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showEditor, setShowEditor] = useState(false)
    const [editingDoc, setEditingDoc] = useState<TRS_Document | null>(null)
    const [viewingDoc, setViewingDoc] = useState<TRS_Document | null>(null)

    const [formData, setFormData] = useState<Partial<TRS_Document>>({
        title: '',
        content: '',
        type: 'MARKDOWN',
        categoryId: 'cat-all',
        url: ''
    })

    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            const matchesTab = activeTab === 'cat-all' || doc.categoryId === activeTab
            const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.content.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesTab && matchesSearch
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }, [documents, activeTab, searchQuery])

    const handleAddCategory = () => {
        const name = prompt('새 카테고리명을 입력하세요:')
        if (name) addCategory(name)
    }

    const handleOpenCreate = () => {
        setEditingDoc(null)
        setFormData({
            title: '',
            content: '',
            type: 'MARKDOWN',
            categoryId: activeTab === 'cat-all' ? 'cat-manual' : activeTab,
            url: ''
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
                author: '관리자'
            })
        }
        setShowEditor(false)
    }

    // Embed URL Helper
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
                    <p className="text-secondary">사내 지식 및 교육 자료를 관리합니다</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenCreate}>
                    <PlusIcon size={18} /> 새 문서 작성
                </button>
            </div>

            {/* Category Tabs */}
            <div className="tabs-container glass-card">
                <div className="tabs">
                    {categories.map(cat => (
                        <div key={cat.id} className="tab-wrapper">
                            <button
                                className={`tab-item ${activeTab === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(cat.id)}
                            >
                                {cat.name}
                            </button>
                            {cat.id !== 'cat-all' && (
                                <button className="cat-delete" onClick={() => deleteCategory(cat.id)}>✕</button>
                            )}
                        </div>
                    ))}
                    <button className="add-cat-btn" onClick={handleAddCategory}>+</button>
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
                                <div className="doc-icon">
                                    {doc.type === 'YOUTUBE' ? <YoutubeIcon size={32} className="text-error" /> :
                                        doc.type === 'EMBED' ? <ExternalLinkIcon size={32} className="text-primary" /> :
                                            <FileTextIcon size={32} className="text-secondary" />}
                                </div>
                                <div className="doc-info">
                                    <h3 className="doc-title">{doc.title}</h3>
                                    <p className="doc-excerpt">{doc.content.substring(0, 60)}...</p>
                                    <div className="doc-meta">
                                        <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                                        <span className="dot"></span>
                                        <span>{doc.author}</span>
                                    </div>
                                </div>
                                <div className="doc-actions" onClick={e => e.stopPropagation()}>
                                    <button className="icon-btn" onClick={() => handleEdit(doc)}><EditIcon size={16} /></button>
                                    <button className="icon-btn danger" onClick={() => deleteDocument(doc.id)}><TrashIcon size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state glass-card">
                        <BookOpenIcon size={48} className="text-muted" />
                        <p>등록된 문서가 없습니다. 새로운 지식을 공유해 보세요!</p>
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
                            <div className="form-group">
                                <label>제목</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="문서 제목을 입력하세요"
                                />
                            </div>
                            <div className="form-row">
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
                                        {formData.type === 'EMBED' ? '구글 문서의 경우 [파일 > 공유 > 웹에 게시] 후 링크를 사용하세요.' : '유튜브 영상 페이지 URL을 그대로 복사해 붙여넣으세요.'}
                                    </p>
                                </div>
                            )}

                            <div className="form-group">
                                <label>설명 및 본문</label>
                                <textarea
                                    rows={10}
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="문서의 주요 내용이나 설명을 입력하세요..."
                                ></textarea>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowEditor(false)}>취소</button>
                                <button type="submit" className="btn btn-primary">저장하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Viewer Perspective */}
            {viewingDoc && (
                <div className="viewer-overlay">
                    <div className="viewer-container glass-card scale-in">
                        <div className="viewer-header">
                            <button className="back-btn" onClick={() => setViewingDoc(null)}>
                                <ArrowLeftIcon size={20} /> 목록으로
                            </button>
                            <div className="viewer-actions">
                                <button className="icon-btn" onClick={() => { handleEdit(viewingDoc); setViewingDoc(null); }}><EditIcon size={18} /></button>
                                <button className="icon-btn danger" onClick={() => { deleteDocument(viewingDoc.id); setViewingDoc(null); }}><TrashIcon size={18} /></button>
                                <button className="icon-btn" onClick={() => setViewingDoc(null)}><XIcon size={20} /></button>
                            </div>
                        </div>
                        <div className="viewer-content">
                            <div className="doc-header">
                                <div className="doc-badge">{categories.find(c => c.id === viewingDoc.categoryId)?.name}</div>
                                <h1>{viewingDoc.title}</h1>
                                <div className="doc-meta">
                                    <span>작성자: {viewingDoc.author}</span>
                                    <span>업데이트: {new Date(viewingDoc.updatedAt).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="doc-body">
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
                                <div className="text-content">
                                    {viewingDoc.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
