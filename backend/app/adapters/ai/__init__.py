"""Real AI provider adapter exports."""

from app.adapters.ai.groq_quote_extractor import GroqQuoteExtractor
from app.adapters.ai.openai_quote_extractor import OpenAIQuoteExtractor

__all__ = ["GroqQuoteExtractor", "OpenAIQuoteExtractor"]
