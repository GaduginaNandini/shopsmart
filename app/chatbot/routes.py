"""Chatbot HTTP endpoint."""
from flask import Blueprint, jsonify, request

from . import service

chat_bp = Blueprint("chat", __name__)


@chat_bp.post("/api/chat")
def chat():
    """Answer one customer message from the written policy or order data."""
    data = request.get_json(force=True, silent=True) or {}
    return jsonify(service.answer(data.get("message", "")))
