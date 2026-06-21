"""Simple authentication module for NephroCare API."""

import json
import hashlib
import secrets
import time
from typing import Any

# In-memory user store (replace with database for production)
USERS_DB: dict[str, dict[str, Any]] = {}
SESSIONS: dict[str, dict[str, Any]] = {}

# Secret key for simple token generation (replace with environment variable)
SECRET_KEY = secrets.token_hex(32)


def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token() -> str:
    """Generate a simple token."""
    return secrets.token_hex(32)


def signup(name: str, email: str, password: str) -> tuple[dict[str, Any], str] | tuple[None, str]:
    """Register a new user.
    
    Returns: (user_dict, token) or (None, error_message)
    """
    # Validate input
    if not name or not email or not password:
        return None, "Missing required fields"
    
    if len(password) < 8:
        return None, "Password must be at least 8 characters"
    
    # Check if user exists
    if email.lower() in USERS_DB:
        return None, "Email already registered"
    
    # Create user
    user_id = secrets.token_hex(8)
    hashed_pwd = hash_password(password)
    
    user_data: dict[str, Any] = {
        "id": user_id,
        "name": name,
        "email": email.lower(),
        "password_hash": hashed_pwd,
        "created_at": time.time(),
    }
    
    USERS_DB[email.lower()] = user_data
    
    # Create session/token
    token = generate_token()
    SESSIONS[token] = {
        "user_id": user_id,
        "email": email.lower(),
        "created_at": time.time(),
    }
    
    return {
        "id": user_id,
        "name": name,
        "email": email,
    }, token


def login(email: str, password: str) -> tuple[dict[str, Any], str] | tuple[None, str]:
    """Authenticate user with email and password.
    
    Returns: (user_dict, token) or (None, error_message)
    """
    if not email or not password:
        return None, "Missing email or password"
    
    user = USERS_DB.get(email.lower())
    if not user:
        return None, "Invalid email or password"
    
    # Verify password
    if user["password_hash"] != hash_password(password):
        return None, "Invalid email or password"
    
    # Create session/token
    token = generate_token()
    SESSIONS[token] = {
        "user_id": user["id"],
        "email": user["email"],
        "created_at": time.time(),
    }
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
    }, token


def verify_token(token: str) -> dict[str, Any] | None:
    """Verify token and return user data if valid.
    
    Returns: user_dict or None
    """
    session = SESSIONS.get(token)
    if not session:
        return None
    
    user = USERS_DB.get(session["email"])
    if not user:
        return None
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
    }


def logout(token: str) -> bool:
    """Invalidate a token."""
    if token in SESSIONS:
        del SESSIONS[token]
        return True
    return False


def google_login(google_user_info: dict[str, str]) -> tuple[dict[str, Any], str] | tuple[None, str]:
    """Create or update user from Google OAuth data.
    
    Expected google_user_info keys: email, name, picture(optional)
    """
    email = google_user_info.get("email", "").lower()
    name = google_user_info.get("name", "")
    
    if not email:
        return None, "Google auth failed: no email"
    
    # Check if user exists
    if email in USERS_DB:
        user = USERS_DB[email]
    else:
        # Create new user from Google data
        user_id = secrets.token_hex(8)
        user = {
            "id": user_id,
            "name": name or "Google User",
            "email": email,
            "password_hash": "",  # No password for OAuth users
            "created_at": time.time(),
            "oauth_provider": "google",
        }
        USERS_DB[email] = user
    
    # Create session/token
    token = generate_token()
    SESSIONS[token] = {
        "user_id": user["id"],
        "email": user["email"],
        "created_at": time.time(),
    }
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
    }, token
