'use client'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ])
  const [message, setMessage] = useState('')

  const sendMessage = async () => {
    setMessage('')
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ])

    const response = fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, { role: 'user', content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true })
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ]
        })
        return reader.read().then(processText)
      })
    })
  }

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        background: 'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
      }}
    >
      <Typography
        variant="h4" // Reduced font size
        color="white"
        sx={{
          fontFamily: '"Raleway", sans-serif', // Updated font to Raleway
          marginBottom: '20px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        TeachTinder
      </Typography>
      <Stack
        direction={'column'}
        width="500px"
        height="700px"
        borderRadius="16px"
        p={2}
        spacing={3}
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0px 0px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Stack
          direction={'column'}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                sx={{
                  backgroundColor:
                    message.role === 'assistant'
                      ? 'rgba(33, 150, 243, 0.8)'
                      : 'rgba(156, 39, 176, 0.8)',
                  color: 'white',
                  borderRadius: '16px',
                  p: 2,
                  maxWidth: '80%',
                  wordWrap: 'break-word',
                  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.2)',
                }}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction={'row'} spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              input: {
                color: 'white',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            sx={{
              backgroundColor: '#21a1f1',
              ':hover': {
                backgroundColor: '#1e88e5',
              },
            }}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
