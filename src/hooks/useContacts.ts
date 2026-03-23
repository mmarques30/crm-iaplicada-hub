import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Contact, ContactWithDeals } from '@/lib/types'
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types'

type ContactInsert = TablesInsert<'contacts'>
type ContactUpdate = TablesUpdate<'contacts'>

export function useContacts(search?: string) {
  const [data, setData] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (search && search.trim()) {
        const term = `%${search.trim()}%`
        query = query.or(
          `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},company.ilike.${term}`
        )
      }

      const { data: contacts, error: err } = await query

      if (err) {
        setError(err.message)
      } else {
        setData((contacts ?? []) as Contact[])
      }

      setLoading(false)
    }

    fetchContacts()
  }, [search])

  return { data, loading, error }
}

export function useContact(id: string) {
  const [data, setData] = useState<ContactWithDeals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }

    async function fetchContact() {
      setLoading(true)
      setError(null)

      const { data: contact, error: err } = await supabase
        .from('contacts')
        .select('*, deals(*)')
        .eq('id', id)
        .single()

      if (err) {
        setError(err.message)
      } else {
        setData(contact as unknown as ContactWithDeals)
      }

      setLoading(false)
    }

    fetchContact()
  }, [id])

  return { data, loading, error }
}

export function useCreateContact() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createContact = useCallback(async (contact: ContactInsert) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data as Contact
  }, [])

  return { createContact, loading, error }
}

export function useUpdateContact() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateContact = useCallback(async (id: string, updates: ContactUpdate) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    setLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data as Contact
  }, [])

  return { updateContact, loading, error }
}
