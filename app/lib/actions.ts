'use server';

import { data } from 'autoprefixer';
import {z} from 'zod';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { redirect} from 'next/navigation';
import Form from '../ui/invoices/create-form';
import {signIn} from '@/auth';
import {AuthError} from 'next-auth';

// Initialize Postgres client
const sql = postgres(process.env.POSTGRES_URL!,{ssl:'require'});

// Define the state type
export type State = {
    errors?:{
        customerId?:string[];
        amount?:string[];
        status?:string[];
    };
    message?:string|null;
}

// Define Zod schema for invoice validation
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer',
    }),
    amount:z.coerce
        .number()
        .gt(0,{message:'Amount must be greater than 0'}),
    status:z.enum(['paid','pending'],{
        invalid_type_error:'Status must be either paid or pending'
    }),
    date:z.string(),
});

const CreateInvoice = FormSchema.omit({id:true,date:true});

// Use Zod to update the expcted types
const UpdateInvoice = FormSchema.omit({id:true,date:true});


// Action to create a new invoice
export async function createInvoice(prevState:State,formData:FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice',
        };
    }
    const {customerId,amount,status} = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql `
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        return {
            message: 'Database error: Failed to Create Invoice',
        }
    }

    // Revalidate the invoices path to reflect the new invoice
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

// Action to update an existing invoice
export async function updateInvoice(id:string, prevState:State, formData:FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice',
        };
    }
    const {customerId,amount,status} = validatedFields.data;
    const amountInCents = amount * 100;
    try {
        await sql `
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        return {
            message: 'Database error: Failed to Update Invoice',
        }
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


// Action to delete an invoice
export async function deleteInvoice(id:string) {
    try {
        await sql `
            DELETE FROM invoices WHERE id = ${id}
        `;
    } catch (error) {
        console.error(error);
        return {
            message: 'Database error: Failed to Delete Invoice',
        }
    }
    revalidatePath('/dashboard/invoices');
}

//
export async function authenticate(
    prevState:string|undefined,
    formData:FormData,
) {
    try {
        await signIn('credentials',formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong'
            } 
        }
        throw error;
    }
}