import { useState, useEffect } from 'react'
import {
    getCompanyDocuments,
    deleteFile,
    type FirestoreFileAttachment,
} from '../../lib/fileService'
import FileUpload, { FileList } from '../../components/FileUpload'
import { FileTextIcon } from '../../components/Icons'
import './CompanyDocuments.css'

export default function CompanyDocuments() {
    const [docs, setDocs] = useState<FirestoreFileAttachment[]>([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        try {
            const data = await getCompanyDocuments()
            setDocs(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('이 서류를 삭제하시겠습니까?')) return
        await deleteFile(id)
        setDocs(docs.filter(d => d.id !== id))
    }

    return (
        <div className="company-documents">
            <h1><FileTextIcon size={22} /> 회사 서류 관리</h1>
            <p className="page-desc">
                고객사가 다운로드할 수 있는 MeatGo 사업자등록증, 통장사본 등을 관리합니다.<br />
                업로드된 파일은 모든 고객사에게 노출됩니다.
            </p>

            <div className="upload-section">
                <h3>새 서류 업로드</h3>
                <FileUpload
                    fileType="COMPANY_DOC"
                    relatedType="COMPANY"
                    relatedId="meatgo"
                    label="회사 서류 업로드"
                    accept="image/*,application/pdf"
                    maxSizeMB={20}
                    onUploaded={(f) => setDocs([f, ...docs])}
                />
            </div>

            <div className="list-section">
                <h3>업로드된 서류 ({docs.length})</h3>
                {loading ? (
                    <p>로딩 중...</p>
                ) : (
                    <FileList files={docs} onDelete={handleDelete} />
                )}
            </div>
        </div>
    )
}
