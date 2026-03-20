import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserProfile,
  toPublicUser,
} from "../models/User.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

function signToken(userId) {
  return jwt.sign({}, assertJwtSecret(), {
    subject: userId,
    expiresIn: "7d",
  });
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return "Укажите email";
  const e = email.trim();
  if (!EMAIL_RE.test(e)) return "Некорректный email";
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== "string") return "Укажите пароль";
  if (password.length < 8) return "Пароль не короче 8 символов";
  return null;
}

export async function register(req, res, next) {
  try {
    const { email, password, companyName } = req.body ?? {};

    const eErr = validateEmail(email);
    if (eErr) return res.status(400).json({ message: eErr });

    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ message: pErr });

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Пользователь с таким email уже зарегистрирован" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      email,
      passwordHash,
      companyName: companyName?.trim?.() || null,
    });

    const token = signToken(user.id);
    return res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    const eErr = validateEmail(email);
    if (eErr) return res.status(400).json({ message: eErr });

    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Укажите пароль" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    const token = signToken(user.id);
    return res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { companyName, companyLogoUrl, companyDetails } = req.body ?? {};
    const patch = {};

    if (companyName !== undefined) {
      if (companyName !== null && typeof companyName !== "string") {
        return res.status(400).json({ message: "companyName должен быть строкой или null" });
      }
      patch.companyName = companyName === null ? null : companyName.trim() || null;
    }

    if (companyLogoUrl !== undefined) {
      if (companyLogoUrl !== null && typeof companyLogoUrl !== "string") {
        return res.status(400).json({ message: "companyLogoUrl должен быть строкой или null" });
      }
      patch.companyLogoUrl = companyLogoUrl;
    }

    if (companyDetails !== undefined) {
      if (companyDetails !== null && typeof companyDetails !== "object") {
        return res.status(400).json({ message: "companyDetails должен быть объектом или null" });
      }
      patch.companyDetails = companyDetails ?? {};
    }

    const updated = await updateUserProfile(req.userId, patch);
    if (!updated) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    return res.json({ user: toPublicUser(updated) });
  } catch (err) {
    next(err);
  }
}
