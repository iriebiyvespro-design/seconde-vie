import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Tag,
  MapPin,
  Phone,
  DollarSign
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { CONDITIONS } from '../data/categories';
import { COMMUNES_ABIDJAN } from '../data/communes';

export default function PublishModal({ onClose, onSuccess, onOpenPricing }) {
  const { publishAd, categories } = useMarketplace();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories?.[0]?.id || 'vetements-mode');
  const [condition, setCondition] = useState('tres-bon-etat');
  const [type, setType] = useState('vente'); // 'vente' ou 'don'
  const [price, setPrice] = useState('');
  const [commune, setCommune] = useState('Cocody');
  const [quartier, setQuartier] = useState('');
  const [contactName, setContactName] = useState(user?.full_name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+225 ');
  const [contactWhatsapp, setContactWhatsapp] = useState(user?.whatsapp || user?.phone || '+225 ');
  
  // Gestion des images et fichiers binaires pour Strapi /upload
  const [images, setImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quartiers disponibles pour la commune choisie
  const selectedCommuneObj = COMMUNES_ABIDJAN.find(c => c.name === commune);
  const availableQuartiers = selectedCommuneObj ? selectedCommuneObj.quartiers : [];

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (imageUrlInput.trim()) {
      setImages(prev => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim() || !description.trim()) {
      setErrorMessage("Veuillez renseigner le titre et la description de l'objet.");
      return;
    }

    if (type === 'vente' && (!price || Number(price) <= 0)) {
      setErrorMessage("Veuillez indiquer un prix valide en FCFA pour la vente.");
      return;
    }

    if (!quartier.trim()) {
      setErrorMessage("Veuillez préciser le quartier pour faciliter la remise en main propre.");
      return;
    }

    if (!contactPhone.trim() || contactPhone.trim() === '+225') {
      setErrorMessage("Veuillez indiquer un numéro de téléphone de contact en Côte d'Ivoire.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Si aucune photo n'a été ajoutée, proposer une photo par défaut élégante
      const finalImages = images.length > 0 ? images : [
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"
      ];

      await publishAd({
        title,
        description,
        category,
        condition,
        type,
        price: type === 'don' ? 0 : price,
        commune,
        quartier,
        contactName: contactName || "Membre Seconde Vie",
        contactPhone,
        contactWhatsapp: contactWhatsapp || contactPhone,
        images: finalImages,
        files: selectedFiles
      });

      setSubmittedSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.message || "Une erreur est survenue lors de la publication. Réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto max-w-3xl bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-200 overflow-hidden my-auto sm:max-h-[92vh] flex flex-col">
        
        {/* Header de la modale */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-creme-200 bg-creme-50/50">
          <div>
            <span className="text-xs font-bold text-eco-800 bg-eco-100 px-2 py-0.5 rounded-md">
              Publication Sécurisée
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              Déposer une annonce
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu du formulaire */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          
          {submittedSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                Annonce soumise avec succès !
              </h3>
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-2">
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" /> Modération en cours
                </div>
                <p className="text-xs leading-relaxed">
                  Conformément à la politique qualité de <strong>Seconde Vie</strong>, votre annonce est actuellement en attente de vérification par notre équipe afin de protéger notre communauté contre les arnaques. Elle sera en ligne d'ici quelques instants !
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-3 bg-eco-700 hover:bg-eco-800 text-white font-extrabold rounded-2xl shadow-md transition"
              >
                Retourner à l'accueil
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Étape 1 : Type d'annonce (Vente vs Don gratuit) */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-500 mb-2">
                  1. Nature de l'annonce
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('vente')}
                    className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition ${
                      type === 'vente'
                        ? 'border-eco-600 bg-eco-50/70 shadow-xs'
                        : 'border-creme-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="font-extrabold text-sm text-slate-900">Vente d'occasion</span>
                    <span className="text-xs text-slate-500 mt-1">Vous fixez un prix en Francs CFA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType('don');
                      setPrice(0);
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition ${
                      type === 'don'
                        ? 'border-warm-500 bg-warm-50 shadow-xs'
                        : 'border-creme-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="font-extrabold text-sm text-warm-700 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-warm-500" /> Don gratuit (0 FCFA)
                    </span>
                    <span className="text-xs text-slate-500 mt-1">Geste solidaire et anti-gaspillage</span>
                  </button>
                </div>
              </div>

              {/* Étape 2 : Photos de l'objet */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold uppercase text-slate-500">
                    2. Photos de l'objet (Plusieurs photos autorisées)
                  </label>
                  <span className="text-xs text-slate-400 font-medium">
                    {images.length} photo(s) ajoutée(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-creme-200 group bg-slate-100">
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 transition shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Bouton Upload local */}
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-creme-300 hover:border-eco-500 bg-creme-50/50 hover:bg-eco-50/30 flex flex-col items-center justify-center cursor-pointer transition p-2 text-center">
                    <Upload className="w-6 h-6 text-eco-600 mb-1" />
                    <span className="text-[11px] font-bold text-slate-700">Importer des photos</span>
                    <span className="text-[9px] text-slate-400">JPG, PNG, WebP</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Ou ajouter par URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Ou collez un lien d'image web..."
                    className="flex-1 p-2 bg-creme-50/60 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-black"
                  >
                    Ajouter le lien
                  </button>
                </div>
              </div>

              {/* Étape 3 : Informations détaillées */}
              <div className="space-y-4">
                <label className="block text-xs font-extrabold uppercase text-slate-500">
                  3. Détails de l'article
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Titre clair de l'annonce *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Canapé 3 places en cuir marron, Robe pagne taille 40..."
                    required
                    className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catégorie *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:border-eco-600 outline-none cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      État de l'objet *
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:border-eco-600 outline-none cursor-pointer"
                    >
                      {CONDITIONS.map(cond => (
                        <option key={cond.id} value={cond.id}>{cond.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {type === 'vente' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prix en Franc CFA (FCFA) *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="100"
                        step="500"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="ex: 15000"
                        required
                        className="w-full p-3 pr-16 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-bold text-eco-900 focus:bg-white focus:border-eco-600 outline-none"
                      />
                      <span className="absolute right-4 font-black text-slate-400 text-xs">
                        FCFA
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description détaillée de l'objet *
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez précisément l'état, les dimensions, l'ancienneté, les accessoires fournis ou la raison de la vente..."
                    required
                    className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm text-slate-800 focus:bg-white focus:border-eco-600 outline-none"
                  />
                </div>
              </div>

              {/* Étape 4 : Localisation & Contact */}
              <div className="space-y-4">
                <label className="block text-xs font-extrabold uppercase text-slate-500">
                  4. Localisation & Contact direct
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Commune / Ville (Côte d'Ivoire) *
                    </label>
                    <select
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                      className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:border-eco-600 outline-none cursor-pointer"
                    >
                      {COMMUNES_ABIDJAN.map(com => (
                        <option key={com.id} value={com.name}>{com.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quartier ou repère précis *
                    </label>
                    <input
                      type="text"
                      list="quartiers-list"
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      placeholder="ex: Angré 8ème tranche, Niangon..."
                      required
                      className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:border-eco-600 outline-none"
                    />
                    <datalist id="quartiers-list">
                      {availableQuartiers.map((q, i) => (
                        <option key={i} value={q} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Votre Nom ou Prénom *
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="ex: Kouamé A."
                      required
                      className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:border-eco-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Numéro WhatsApp / Appel *
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => {
                        setContactPhone(e.target.value);
                        setContactWhatsapp(e.target.value);
                      }}
                      placeholder="+225 07 00 00 00 00"
                      required
                      className="w-full p-3 bg-creme-50/50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bouton de soumission */}
              <div className="pt-4 border-t border-creme-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {isSubmitting ? "Envoi en cours..." : "Soumettre à la modération →"}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}

