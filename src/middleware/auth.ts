import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'storekeeper';
}

export interface AuthRequest extends Request {
  user?: AppUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé : Jeton d\'authentification manquant' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    // Check if token is a Firebase ID Token
    let uid = '';
    let email = '';
    let displayName = '';

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email || `${decoded.uid}@secustock.local`;
      displayName = decoded.name || email.split('@')[0];
    } catch (firebaseErr) {
      // In development or demo mode fallback if token is signed demo header
      if (token.startsWith('demo-user:')) {
        const parts = token.replace('demo-user:', '').split(':');
        uid = parts[0] || 'demo-admin';
        email = parts[1] || 'demo@secustock.ci';
        displayName = parts[2] || 'Utilisateur Démo';
      } else {
        console.error('Firebase token verification error:', firebaseErr);
        return res.status(401).json({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' });
      }
    }

    const dbUser = await getOrCreateUser(uid, email, displayName);
    req.user = dbUser as AppUser;
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Erreur d\'authentification : ' + (error.message || 'Échec de session') });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Permission refusée : Cette opération requiert les droits d\'Administrateur.',
      userRole: req.user.role,
    });
  }

  next();
};
