'use client';

import React, { useState } from 'react';
import { useWallet } from '@/app/hooks/useWallet';
import { CLAIM_TOPICS } from '@/app/lib/types/trusted-issuers';

export function RequestTrustedIssuer() {
  const { wallet } = useWallet();
  const [organizationName, setOrganizationName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTopicToggle = (topicId: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address) {
      setError('Conecta tu wallet para continuar');
      return;
    }

    if (!organizationName.trim() || selectedTopics.length === 0) {
      setError('Completa todos los campos requeridos');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      const formData = new FormData();
      formData.append(
        'data',
        JSON.stringify({
          requesterAddress: wallet.address,
          organizationName: organizationName.trim(),
          description: description.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          website: website.trim() || undefined,
          claimTopics: selectedTopics,
        })
      );

      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/trusted-issuers/request', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar solicitud');
      }

      setSuccess(true);
      // Limpiar formulario
      setOrganizationName('');
      setDescription('');
      setContactEmail('');
      setWebsite('');
      setSelectedTopics([]);
      setFile(null);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setError(err.message || 'Error al enviar solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!wallet?.address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Conecta tu wallet para solicitar ser trusted issuer.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Solicitar ser Trusted Issuer
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="organizationName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Nombre de la Organización *
          </label>
          <input
            type="text"
            id="organizationName"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="contactEmail"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email de Contacto
            </label>
            <input
              type="email"
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Website
            </label>
            <input
              type="url"
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Claim Topics que puedes emitir *
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {CLAIM_TOPICS.map((topic) => (
                <label
                  key={topic.id}
                  className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic.id)}
                    onChange={() => handleTopicToggle(topic.id)}
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {topic.name} (ID: {topic.id})
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {topic.description} - {topic.commonUse}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {selectedTopics.length === 0 && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Selecciona al menos un claim topic
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="file"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Archivo Adjunto (opcional)
          </label>
          <input
            type="file"
            id="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Puedes adjuntar documentación que respalde tu solicitud (certificados, licencias, etc.)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
            Solicitud enviada exitosamente. Será revisada por el administrador.
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !organizationName.trim() || selectedTopics.length === 0}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  );
}

