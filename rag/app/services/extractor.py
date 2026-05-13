import logging
import requests
from io import BytesIO
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


def extract_text(
    source_type: str,
    source_url: Optional[str] = None,
    raw_text: Optional[str] = None,
) -> Tuple[str, Optional[int]]:
    """
    Extract text from various sources.
    Returns (text, page_count)
    """
    try:
        if source_type == "raw_text":
            return (raw_text or ""), None

        if source_type == "url":
            return _extract_url(source_url), None

        if source_type == "image":
            return _extract_image(source_url), None

        # File-based: download from Cloudinary URL
        if not source_url:
            raise ValueError("source_url required for file types")

        response = requests.get(source_url, timeout=30)
        
        # Enhanced error handling for Cloudinary issues
        if response.status_code == 401:
            logger.error(
                f"[extractor] Cloudinary 401 Unauthorized. File may not be publicly accessible. "
                f"URL: {source_url}. Consider enabling public file delivery in Cloudinary account settings."
            )
        elif response.status_code == 500:
            logger.error(
                f"[extractor] Cloudinary 500 Server Error. This may indicate account restrictions "
                f"or misconfiguration. URL: {source_url}"
            )
        
        response.raise_for_status()
        buffer = BytesIO(response.content)

        if source_type == "pdf":
            return _extract_pdf(buffer)
        elif source_type == "docx":
            return _extract_docx(buffer), None
        elif source_type == "ppt":
            return _extract_pptx(buffer), None
        elif source_type == "txt":
            return buffer.read().decode("utf-8", errors="ignore").strip(), None
        else:
            raise ValueError(f"Unsupported source type: {source_type}")

    except Exception as e:
        logger.error(f"[extractor] Error extracting {source_type}: {e}")
        raise


def _extract_pdf(buffer: BytesIO) -> Tuple[str, int]:
    from pypdf import PdfReader
    reader = PdfReader(buffer)
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    return "\n\n".join(pages), len(reader.pages)


def _extract_docx(buffer: BytesIO) -> str:
    from docx import Document
    doc = Document(buffer)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _extract_pptx(buffer: BytesIO) -> str:
    from pptx import Presentation
    prs = Presentation(buffer)
    slides_text = []
    for i, slide in enumerate(prs.slides):
        texts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                texts.append(shape.text.strip())
        if texts:
            slides_text.append(f"[Slide {i+1}]\n" + "\n".join(texts))
    return "\n\n".join(slides_text)


def _extract_url(url: str) -> str:
    from bs4 import BeautifulSoup
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
    }
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    # Remove script/style
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    # Get main content
    main = soup.find("main") or soup.find("article") or soup.find("body")
    text = main.get_text(separator="\n") if main else soup.get_text(separator="\n")

    # Clean up
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if len(line) > 30]
    return "\n\n".join(lines[:300])  # Max 300 lines


def _extract_image(url: str) -> str:
    try:
        import pytesseract
        from PIL import Image
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        return pytesseract.image_to_string(img)
    except ImportError:
        logger.warning("pytesseract not available, returning empty string")
        return ""