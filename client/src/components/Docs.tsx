import { useNavigate } from "react-router-dom"
import Img1 from "../assets/logo.svg"

export const Docs = ({ documentId, docName }: { documentId: string, docName: string }) => {
    const navigate = useNavigate() ;

    const openDoc = (id: string) => {
        navigate(`/documents/${id}`) ;
    }
    return(
        <div className="docs" onClick={() => {openDoc(documentId); }}>
            <img src={Img1} alt="icon"/>
            <div> {docName} </div>
        </div>
    )
}